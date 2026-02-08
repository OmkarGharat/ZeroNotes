import React, { useEffect, useRef, useState } from 'react';
import { PageEditor } from '@blocksuite/presets';
import { DocCollection, Schema, Job } from '@blocksuite/store';
import { AffineSchemas, HtmlAdapter, HtmlTransformer } from '@blocksuite/blocks';
import { ThemeProvider } from '@blocksuite/blocks';
import lodash from 'lodash';

// Register effects
import { effects as blockEffects } from '@blocksuite/blocks/effects';
import { effects as presetEffects } from '@blocksuite/presets/effects';

// Styles
import '@toeverything/theme/style.css';

// Call registration functions immediately
blockEffects();
presetEffects();

interface BlockSuiteEditorProps {
    initialContentHtml?: string;
    initialSnapshot?: any;
    onChange: (html: string, snapshot: any) => void;
}

const BlockSuiteEditor: React.FC<BlockSuiteEditorProps> = ({ initialContentHtml, initialSnapshot, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<PageEditor | null>(null);
    const collectionRef = useRef<DocCollection | null>(null);
    const isInitializing = useRef<boolean>(true);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // 1. Theme Syncing
    useEffect(() => {
        const checkTheme = () => {
            const hasDarkClass = document.documentElement.classList.contains('dark') || 
                                document.body.classList.contains('dark');
            const theme = hasDarkClass ? 'dark' : 'light';
            setIsDarkMode(hasDarkClass);
            
            // Set data-theme on html and body for BlockSuite global styles
            document.documentElement.setAttribute('data-theme', theme);
            document.body.setAttribute('data-theme', theme);
            
            if (editorRef.current) {
                editorRef.current.dataset.theme = theme;
                
                // Also set internal BlockSuite theme via service
                try {
                    // @ts-ignore
                    const std = editorRef.current.std;
                    if (std) {
                        const themeProvider = (std as any).get(ThemeProvider);
                        if (themeProvider) {
                            themeProvider.app$.value = theme as any;
                            if (themeProvider.theme$) {
                                themeProvider.theme$.value = theme as any;
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to sync theme:', err);
                }
            }
        };

        checkTheme();

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    checkTheme();
                    break;
                }
            }
        });
        
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        
        return () => observer.disconnect();
    }, []);

    // 2. Editor Lifecycle
    useEffect(() => {
        if (!containerRef.current) return;
        if (editorRef.current) return;

        const schema = new Schema().register(AffineSchemas);
        const collection = new DocCollection({ schema });
        collectionRef.current = collection;
        collection.meta.initialize();
        collection.start();

        const initEditor = async () => {
            try {
                let targetDoc;

                if (initialSnapshot) {
                    try {
                        const job = new Job({ collection });
                        targetDoc = await job.snapshotToDoc(initialSnapshot);
                    } catch (err) {
                        console.warn("Snapshot load failed:", err);
                    }
                } 
                
                if (!targetDoc && initialContentHtml && initialContentHtml.trim() !== "") {
                    try {
                        const docId = await HtmlTransformer.importHTMLToDoc({
                            collection,
                            html: initialContentHtml,
                        });
                        if (docId) {
                            targetDoc = collection.getDoc(docId);
                        }
                    } catch (err) {
                        console.warn("HTML import failed:", err);
                    }
                }

                if (!targetDoc) {
                    targetDoc = collection.createDoc();
                    // Basic skeleton for empty doc
                    targetDoc.load(() => {
                        const pageId = targetDoc!.addBlock('affine:page', {
                            title: { "deltas": [{ "insert": "" }] }
                        });
                        targetDoc!.addBlock('affine:surface', {}, pageId);
                        const noteId = targetDoc!.addBlock('affine:note', {}, pageId);
                        targetDoc!.addBlock('affine:paragraph', {}, noteId);
                    });
                }

                if (!targetDoc.loaded) {
                    await new Promise<void>((resolve) => {
                        targetDoc!.load(() => resolve());
                    });
                }

                const editor = new PageEditor();
                editor.doc = targetDoc;
                editor.autofocus = true;
                
                // Important: Apply initial theme
                const hasDarkClass = document.documentElement.classList.contains('dark') || 
                                    document.body.classList.contains('dark');
                editor.dataset.theme = hasDarkClass ? 'dark' : 'light';
                
                // Ensure it takes full height and has no internal overflow
                editor.style.height = '100%';
                editor.style.width = '100%';
                editor.style.backgroundColor = 'transparent';
                editor.style.display = 'block';
                editor.tabIndex = 0; // Make it focusable
                
                containerRef.current?.appendChild(editor);
                editorRef.current = editor;

                // ✅ PLACE CURSOR IMMEDIATELY for better UX
                setTimeout(() => {
                    try {
                        console.log('[CURSOR INIT] Attempting immediate cursor placement...');
                        // @ts-ignore
                        const host = editor.host;
                        const pageRoot = editor.querySelector('affine-page-root');
                        
                        if (host?.selection && targetDoc && pageRoot) {
                            const paragraphBlock = targetDoc.getBlockByFlavour('affine:paragraph')[0];
                            if (paragraphBlock) {
                                console.log('[CURSOR INIT] Setting cursor at start of first paragraph');
                                
                                host.selection.setGroup('note', [
                                    host.selection.create('text', {
                                        from: {
                                            blockId: paragraphBlock.id,
                                            index: 0,
                                            length: 0
                                        },
                                        to: null
                                    })
                                ]);
                                
                                (pageRoot as HTMLElement).focus();
                                console.log('[CURSOR INIT] Cursor placement complete');
                                
                                // Verify cursor appeared
                                setTimeout(() => {
                                    const selection = window.getSelection();
                                    if (selection && selection.rangeCount > 0) {
                                        console.log('[CURSOR INIT] ✅ Cursor successfully placed!');
                                    } else {
                                        console.log('[CURSOR INIT] Cursor not visible, triggering click...');
                                        const firstParagraph = pageRoot.querySelector('[data-block-id]');
                                        if (firstParagraph) {
                                            (firstParagraph as HTMLElement).click();
                                        }
                                    }
                                }, 50);
                            }
                        }
                    } catch (err) {
                        console.error('[CURSOR INIT] Failed:', err);
                    }
                }, 300); // Fast cursor placement

                // === COMPREHENSIVE DEBUGGING ===
                
                // Debug: Paste events at multiple levels
                window.addEventListener('paste', (e) => {
                    console.log('[WINDOW] Paste event detected', {
                        target: e.target,
                        clipboardData: e.clipboardData?.getData('text/plain')?.substring(0, 50)
                    });
                });

                document.addEventListener('paste', (e) => {
                    console.log('[DOCUMENT] Paste event detected', {
                        target: e.target,
                        activeElement: document.activeElement,
                        clipboardData: e.clipboardData?.getData('text/plain')?.substring(0, 50)
                    });
                });

                editor.addEventListener('paste', (e) => {
                    console.log('[EDITOR] Paste event detected', {
                        target: e.target,
                        currentTarget: e.currentTarget,
                        clipboardData: e.clipboardData?.getData('text/plain')?.substring(0, 50),
                        defaultPrevented: e.defaultPrevented,
                        propagationStopped: e.cancelBubble
                    });
                    
                    // Try to manually insert if BlockSuite doesn't handle it
                    const text = e.clipboardData?.getData('text/plain');
                    if (text && targetDoc) {
                        console.log('[MANUAL INSERT] Attempting manual text insertion...');
                        console.log('[MANUAL INSERT] Editor structure:', editor);
                        console.log('[MANUAL INSERT] Editor.host:', editor.host);
                        
                        // Try to insert via document API
                        setTimeout(() => {
                            try {
                                // @ts-ignore - Access editor's internal selection
                                const host = editor.host;
                                console.log('[MANUAL INSERT] Host object:', host);
                                
                                if (host) {
                                    // @ts-ignore
                                    const selection = host.selection;
                                    console.log('[MANUAL INSERT] Selection object:', selection);
                                    console.log('[MANUAL INSERT] Selection type:', typeof selection);
                                    console.log('[MANUAL INSERT] Selection methods:', selection ? Object.keys(selection) : 'none');
                                    
                                    if (selection) {
                                        const textSelection = selection.find('text');
                                        console.log('[MANUAL INSERT] Text selection:', textSelection);
                                        console.log('[MANUAL INSERT] Text selection keys:', textSelection ? Object.keys(textSelection) : 'none');
                                        
                                        if (textSelection) {
                                            const blockId = textSelection.blockId;
                                            const index = textSelection.from?.index ?? textSelection.index;
                                            console.log('[MANUAL INSERT] BlockId:', blockId);
                                            console.log('[MANUAL INSERT] textSelection.from:', textSelection.from);
                                            console.log('[MANUAL INSERT] Index:', index);
                                            
                                            const block = targetDoc.getBlock(blockId);
                                            console.log('[MANUAL INSERT] Found block at cursor:', block);
                                            console.log('[MANUAL INSERT] Block keys:', block ? Object.keys(block) : 'null');
                                            
                                            // Access the model which has the text property
                                            const model = block?.model || block;
                                            console.log('[MANUAL INSERT] Model:', model);
                                            console.log('[MANUAL INSERT] Model.text:', model?.text);
                                            
                                            if (model?.text && index !== undefined) {
                                                console.log('[MANUAL INSERT] Model text property found, inserting at index:', index);
                                                model.text.insert(text, index);
                                                console.log('[MANUAL INSERT] Text insertion successful at cursor position via model');
                                                
                                                // Move cursor to the end of pasted text
                                                const newIndex = index + text.length;
                                                setTimeout(() => {
                                                    try {
                                                        // @ts-ignore
                                                        const host = editor.host;
                                                        if (host?.selection) {
                                                            host.selection.setGroup('note', [
                                                                host.selection.create('text', {
                                                                    from: {
                                                                        blockId: blockId,
                                                                        index: newIndex,
                                                                        length: 0
                                                                    },
                                                                    to: null
                                                                })
                                                            ]);
                                                            console.log('[MANUAL INSERT] Cursor moved to end of pasted text at index:', newIndex);
                                                        }
                                                        
                                                        // Force hide placeholder by removing data-placeholder attribute
                                                        const blockElement = editor.querySelector(`[data-block-id="${blockId}"]`);
                                                        if (blockElement) {
                                                            const placeholderElements = blockElement.querySelectorAll('[data-placeholder]');
                                                            placeholderElements.forEach(el => {
                                                                if (el.textContent && el.textContent.trim().length > 0) {
                                                                    el.removeAttribute('data-placeholder');
                                                                }
                                                            });
                                                        }
                                                    } catch (err) {
                                                        console.error('[MANUAL INSERT] Failed to move cursor:', err);
                                                    }
                                                }, 10);
                                                
                                                return;
                                            } else {
                                                console.error('[MANUAL INSERT] Could not access model.text', { hasModel: !!model, hasText: !!model?.text, index });
                                            }
                                        } else {
                                            console.error('[MANUAL INSERT] No text selection found');
                                        }
                                    } else {
                                        console.error('[MANUAL INSERT] Selection is null/undefined');
                                    }
                                } else {
                                    console.error('[MANUAL INSERT] Host is null/undefined');
                                }
                                
                                // Fallback: insert at first paragraph if selection not found
                                console.log('[MANUAL INSERT] Using fallback insertion method...');
                                const paragraphBlock = targetDoc.getBlockByFlavour('affine:paragraph')[0];
                                
                                if (paragraphBlock?.text) {
                                    const currentLength = paragraphBlock.text.length;
                                    console.log('[MANUAL INSERT] Fallback - inserting at end, length:', currentLength);
                                    paragraphBlock.text.insert(text, currentLength);
                                    console.log('[MANUAL INSERT] Text insertion successful via fallback');
                                } else {
                                    console.error('[MANUAL INSERT] No paragraph block found for fallback');
                                }
                            } catch (err) {
                                console.error('[MANUAL INSERT] Failed:', err);
                                console.error('[MANUAL INSERT] Error stack:', err.stack);
                            }
                        }, 100);
                    }
                });

                // Debug: Keyboard events
                editor.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.key === 'v') {
                        console.log('[EDITOR] Ctrl+V keydown detected');
                    }
                    console.log('[EDITOR] Keydown:', e.key, 'Ctrl:', e.ctrlKey);
                });

                // Debug: Focus events
                editor.addEventListener('focus', () => {
                    console.log('[EDITOR] Focus event received');
                });

                editor.addEventListener('blur', () => {
                    console.log('[EDITOR] Blur event received');
                });

                // Track clicks to see if editor is receiving interaction
                editor.addEventListener('click', () => {
                    console.log('[EDITOR] Click detected, activeElement:', document.activeElement);
                });

                // Aggressive focus strategy
                setTimeout(() => {
                    console.log('=== FOCUS ATTEMPT START ===');
                    console.log('Container exists:', !!containerRef.current);
                    console.log('Editor exists:', !!editor);
                    console.log('Editor in DOM:', document.body.contains(editor));
                    console.log('Current activeElement BEFORE focus:', document.activeElement);
                    
                    // 1. Focus the main element
                    editor.focus({ preventScroll: true });
                    console.log('Called editor.focus()');
                    console.log('ActiveElement AFTER editor.focus():', document.activeElement);
                    console.log('Is editor focused?:', document.activeElement === editor);
                    
                    // 2. Try to find and focus the internal host or viewport
                    const host = editor.shadowRoot?.querySelector('affine-editor-host') || 
                                 editor.querySelector('affine-editor-host') ||
                                 editor.shadowRoot?.querySelector('.affine-page-viewport') ||
                                 editor.querySelector('.affine-page-viewport');
                    
                    console.log('Found internal host/viewport?:', !!host);
                    if (host) {
                        console.log('Host element:', host);
                    }
                                 
                    if (host && (host as HTMLElement).focus) {
                        (host as HTMLElement).tabIndex = 0;
                        (host as HTMLElement).focus();
                        console.log('Called host.focus()');
                        console.log('ActiveElement AFTER host.focus():', document.activeElement);
                    }
                    
                    console.log('=== FOCUS ATTEMPT END ===');
                    console.log('Final activeElement:', document.activeElement);
                    console.log('Editor contains activeElement?:', editor.contains(document.activeElement));
                }, 800);

                // Additional focus check after 2 seconds
                setTimeout(() => {
                    console.log('=== 2s FOCUS & CURSOR CHECK ===');
                    console.log('[2s CHECK] ActiveElement:', document.activeElement);
                    console.log('[2s CHECK] ActiveElement tag:', document.activeElement?.tagName);
                    console.log('[2s CHECK] Editor tabIndex:', editor.tabIndex);
                    console.log('[2s CHECK] Editor is focusable?:', editor.tabIndex >= 0);
                    
                    // Check if affine-page-root is focused
                    const pageRoot = editor.querySelector('affine-page-root');
                    console.log('[2s CHECK] affine-page-root exists:', !!pageRoot);
                    console.log('[2s CHECK] affine-page-root is activeElement:', document.activeElement === pageRoot);
                    console.log('[2s CHECK] affine-page-root has contenteditable:', pageRoot?.getAttribute('contenteditable'));
                    
                    // Check selection
                    const windowSelection = window.getSelection();
                    console.log('[2s CHECK] Window selection:', windowSelection);
                    console.log('[2s CHECK] Selection range count:', windowSelection?.rangeCount);
                    console.log('[2s CHECK] Selection is collapsed:', windowSelection?.isCollapsed);
                    
                    // Try to manually set cursor using BlockSuite's selection API
                    try {
                        // @ts-ignore
                        const host = editor.host;
                        if (host?.selection && targetDoc) {
                            const paragraphBlock = targetDoc.getBlockByFlavour('affine:paragraph')[0];
                            if (paragraphBlock) {
                                console.log('[CURSOR] Attempting to set cursor at start of first paragraph');
                                console.log('[CURSOR] Paragraph block ID:', paragraphBlock.id);
                                
                                host.selection.setGroup('note', [
                                    host.selection.create('text', {
                                        from: {
                                            blockId: paragraphBlock.id,
                                            index: 0,
                                            length: 0
                                        },
                                        to: null
                                    })
                                ]);
                                
                                console.log('[CURSOR] Cursor placement attempted');
                                
                                // Focus the page root after setting selection
                                if (pageRoot) {
                                    (pageRoot as HTMLElement).focus();
                                    console.log('[CURSOR] Focused affine-page-root');
                                    
                                    // Wait a bit and check if cursor appeared
                                    setTimeout(() => {
                                        const selectionAfter = window.getSelection();
                                        console.log('[CURSOR] Selection after focus:', selectionAfter);
                                        console.log('[CURSOR] Range count after focus:', selectionAfter?.rangeCount);
                                        
                                        if (!selectionAfter || selectionAfter.rangeCount === 0) {
                                            console.log('[CURSOR] No cursor detected, trying click simulation...');
                                            
                                            // Try clicking into the first paragraph to trigger cursor
                                            const firstParagraph = pageRoot.querySelector('[data-block-id]');
                                            if (firstParagraph) {
                                                console.log('[CURSOR] Clicking first paragraph:', firstParagraph);
                                                (firstParagraph as HTMLElement).click();
                                                
                                                setTimeout(() => {
                                                    const finalSelection = window.getSelection();
                                                    console.log('[CURSOR] Final selection after click:', finalSelection);
                                                    console.log('[CURSOR] Final range count:', finalSelection?.rangeCount);
                                                }, 100);
                                            }
                                        } else {
                                            console.log('[CURSOR] ✅ Cursor successfully placed!');
                                        }
                                    }, 100);
                                }
                            } else {
                                console.error('[CURSOR] No paragraph block found');
                            }
                        } else {
                            console.error('[CURSOR] Host or selection not available');
                        }
                    } catch (err) {
                        console.error('[CURSOR] Failed to set cursor:', err);
                    }
                    
                    console.log('=== END 2s CHECK ===');
                    
                    // DEBUG: Check for visible borders
                    console.log('[BORDER DEBUG] Checking for borders...');
                    const elementsWithBorder = [];
                    
                    // Check editor
                    const editorStyle = window.getComputedStyle(editor);
                    console.log('[BORDER DEBUG] Editor border:', editorStyle.border);
                    console.log('[BORDER DEBUG] Editor outline:', editorStyle.outline);
                    if (editorStyle.border !== 'none' && editorStyle.border !== '0px') {
                        elementsWithBorder.push({ element: 'page-editor', border: editorStyle.border });
                    }
                    
                    // Check container
                    const container = containerRef.current;
                    if (container) {
                        const containerStyle = window.getComputedStyle(container);
                        console.log('[BORDER DEBUG] Container border:', containerStyle.border);
                        console.log('[BORDER DEBUG] Container outline:', containerStyle.outline);
                        if (containerStyle.border !== 'none' && containerStyle.border !== '0px') {
                            elementsWithBorder.push({ element: 'container', border: containerStyle.border });
                        }
                    }
                    
                    // Check affine-page-root (reuse pageRoot from above)
                    if (pageRoot) {
                        const rootStyle = window.getComputedStyle(pageRoot);
                        console.log('[BORDER DEBUG] affine-page-root border:', rootStyle.border);
                        console.log('[BORDER DEBUG] affine-page-root outline:', rootStyle.outline);
                        if (rootStyle.border !== 'none' && rootStyle.border !== '0px') {
                            elementsWithBorder.push({ element: 'affine-page-root', border: rootStyle.border });
                        }
                        if (rootStyle.outline !== 'none' && rootStyle.outline !== '0px') {
                            elementsWithBorder.push({ element: 'affine-page-root (outline)', outline: rootStyle.outline });
                        }
                    }
                    
                    console.log('[BORDER DEBUG] Elements with visible borders:', elementsWithBorder);
                }, 2000);

                // Set BlockSuite's internal theme
                const setTheme = () => {
                    try {
                        const hasDarkClass = document.documentElement.classList.contains('dark') || 
                                            document.body.classList.contains('dark');
                        const theme = hasDarkClass ? 'dark' : 'light';
                        
                        // @ts-ignore - accessing internal API
                        const std = editor.std;
                        if (std) {
                            try {
                                const themeProvider = (std as any).get(ThemeProvider);
                                if (themeProvider) {
                                    themeProvider.app$.value = theme as any;
                                    if (themeProvider.theme$) {
                                        themeProvider.theme$.value = theme as any;
                                    }
                                }
                            } catch (providerErr) {
                                // Silent fail for production cleanup
                            }
                        }
                    } catch (err) {
                        console.error('Failed to set BlockSuite theme:', err);
                    }
                };
                
                // Set initial theme
                setTimeout(setTheme, 100);
                setTimeout(setTheme, 500);

                const debouncedUpdate = lodash.debounce(async () => {
                    if (isInitializing.current || !targetDoc) return;
                    
                    try {
                        const job = new Job({ collection });
                        const snapshot = job.docToSnapshot(targetDoc);
                        if (!snapshot) return;

                        const htmlAdapter = new HtmlAdapter(job);
                        const result = await htmlAdapter.fromDocSnapshot({ snapshot });
                        
                        onChange(result.file, snapshot);
                    } catch (err) {
                        console.error("Export failure:", err);
                    }
                }, 1000);

                const cleanup = targetDoc.slots.blockUpdated.on(debouncedUpdate);
                const timerId = setTimeout(() => {
                    isInitializing.current = false;
                }, 1500);

                return () => {
                    cleanup.dispose();
                    debouncedUpdate.cancel();
                    clearTimeout(timerId);
                    if (editor && containerRef.current?.contains(editor)) {
                        containerRef.current.removeChild(editor);
                    }
                    editorRef.current = null;
                };
            } catch (err) {
                console.error("BlockSuite Setup Error:", err);
            }
        };

        const cleanupPromise = initEditor();

        return () => {
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };

    }, []);

    return (
        <div 
            ref={containerRef} 
            className="blocksuite-editor-container" 
            style={{ 
                height: '100%', 
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'transparent'
            }} 
        />
    );
};

export default BlockSuiteEditor;
