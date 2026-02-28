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
                        if (initialSnapshot.customBlobs) {
                            try {
                                const blobSync = (collection as any).blobSync;
                                if (blobSync) {
                                    for (const [sourceId, dataUrl] of Object.entries(initialSnapshot.customBlobs)) {
                                        try {
                                            const res = await fetch(dataUrl as string);
                                            const blob = await res.blob();
                                            // Some blob syncs take (key, Uint8Array), others (key, Blob), others only 1 arg.
                                            let newId = sourceId;
                                            try {
                                                if (blobSync.set.length >= 2) {
                                                    await blobSync.set(sourceId, blob);
                                                } else {
                                                    newId = await blobSync.set(blob);
                                                }
                                            } catch (e) {
                                                // Fallback to array buffer if it needs Uint8Array
                                                const buf = new Uint8Array(await blob.arrayBuffer());
                                                if (blobSync.set.length >= 2) {
                                                    await blobSync.set(sourceId, buf);
                                                } else {
                                                    newId = await blobSync.set(buf);
                                                }
                                            }

                                            // If ID mismatched because it ignores our passed-in ID, update the snapshot block!
                                            if (newId !== sourceId && initialSnapshot.blocks) {
                                                for (const block of Object.values<any>(initialSnapshot.blocks)) {
                                                    if (block.flavour === 'affine:image' && (block.sourceId === sourceId || block.props?.sourceId === sourceId)) {
                                                        if (block.sourceId === sourceId) block.sourceId = newId;
                                                        if (block.props?.sourceId) block.props.sourceId = newId;
                                                    }
                                                }
                                            }
                                        } catch (e) {
                                            console.warn("Failed to load blob", sourceId, e);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error("Blob Sync hydration error:", e);
                            }
                        }

                        targetDoc = await job.snapshotToDoc(initialSnapshot);

                        // Fix for readonly lists bug: check if text fields somehow became simple strings or proxies
                        // and lack the Y.Text insert method. If so, fallback to HTML.
                        if (targetDoc) {
                           let hasInvalidText = false;
                           const blocks = targetDoc.getBlocks();
                           for (const block of Object.values(blocks)) {
                               const b = block as any;
                               if (b.model && b.model.text && typeof b.model.text.insert !== 'function') {
                                   hasInvalidText = true;
                                   break;
                               }
                           }
                           if (hasInvalidText) {
                               targetDoc = undefined; // Force fallback to HTML import
                           }
                        }
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

                // FIX: BlockSuite click-to-cursor not placing caret on clicked paragraph.
                // Use browser's caretRangeFromPoint to force correct cursor placement.
                editor.addEventListener('click', (e) => {
                    try {
                        let range: Range | null = null;
                        if ((document as any).caretRangeFromPoint) {
                            range = (document as any).caretRangeFromPoint(e.clientX, e.clientY);
                        } else if (document.caretPositionFromPoint) {
                            const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                            if (pos) {
                                range = document.createRange();
                                range.setStart(pos.offsetNode, pos.offset);
                                range.collapse(true);
                            }
                        }
                        if (range) {
                            const sel = window.getSelection();
                            if (sel) {
                                sel.removeAllRanges();
                                sel.addRange(range);
                            }
                        }
                    } catch (_) {
                        // Silent fail — let BlockSuite handle it
                    }
                });
                
                containerRef.current?.appendChild(editor);
                editorRef.current = editor;

                // ✅ PLACE CURSOR IMMEDIATELY for better UX
                setTimeout(() => {
                    try {
                        // @ts-ignore
                        const host = editor.host;
                        const pageRoot = editor.querySelector('affine-page-root');
                        
                        if (host?.selection && targetDoc && pageRoot) {
                            let targetBlock: any = null;
                            const noteBlock = targetDoc.getBlockByFlavour('affine:note')[0];
                            
                            if (noteBlock && (noteBlock as any).children?.length > 0) {
                                const children = (noteBlock as any).children;
                                targetBlock = children[children.length - 1];
                            } else {
                                targetBlock = targetDoc.getBlockByFlavour('affine:paragraph')[0];
                            }

                            if (targetBlock) {
                                const targetBlockId = targetBlock.id;
                                const textLength = targetBlock.text?.length || targetBlock.model?.text?.length || 0;
                                
                                host.selection.setGroup('note', [
                                    host.selection.create('text', {
                                        from: {
                                            blockId: targetBlockId,
                                            index: textLength,
                                            length: 0
                                        },
                                        to: null
                                    })
                                ]);
                                
                                (pageRoot as HTMLElement).focus();
                                
                                // Verify cursor appeared
                                setTimeout(() => {
                                    const selection = window.getSelection();
                                    if (!selection || selection.rangeCount === 0) {
                                        const el = pageRoot.querySelector(`[data-block-id="${targetBlockId}"]`) || pageRoot.querySelector('[data-block-id]');
                                        if (el) {
                                            (el as HTMLElement).click();
                                        }
                                    }
                                }, 50);
                            }
                        }
                    } catch (err) {
                        // Silent fail
                    }
                }, 300);

                // ✅ BUG FIX: BlockSuite's placeholder overlap on block merge
                // The placeholder is a <div class="affine-paragraph-placeholder visible"> inside
                // each affine-paragraph. BlockSuite's reactive signal sometimes fails to clear
                // the "visible" class after Delete/Backspace merges blocks.
                // We directly check and remove the "visible" class when the sibling rich-text has text.
                const fixPlaceholderOverlap = () => {
                    const pageRoot = editor.querySelector('affine-page-root');
                    if (!pageRoot) return;

                    const visiblePlaceholders = pageRoot.querySelectorAll('.affine-paragraph-placeholder.visible');
                    visiblePlaceholders.forEach((placeholder) => {
                        // The placeholder is a sibling of <rich-text> inside .affine-paragraph-rich-text-wrapper
                        const wrapper = placeholder.parentElement;
                        if (!wrapper) return;
                        const richText = wrapper.querySelector('rich-text');
                        if (!richText) return;

                        // Check if the rich-text has actual text content (not just zero-width spaces)
                        const text = richText.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                        if (text && text.length > 0) {
                            // Block has real text — placeholder should NOT be visible
                            placeholder.classList.remove('visible');
                        }
                    });
                };

                // Run fix on Delete/Backspace keypresses
                editor.addEventListener('keyup', (e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                        // Run at multiple timings to catch the reactive update
                        setTimeout(fixPlaceholderOverlap, 0);
                        setTimeout(fixPlaceholderOverlap, 50);
                        setTimeout(fixPlaceholderOverlap, 150);
                    }
                });
                
                // Guard: pause MutationObserver during clicks to avoid interfering with cursor
                let isClickInProgress = false;
                editor.addEventListener('mousedown', () => {
                    isClickInProgress = true;
                    setTimeout(() => { isClickInProgress = false; }, 500);
                });

                // Also run on any mutations as a safety net — but NOT during click interactions
                const observer = new MutationObserver((mutations) => {
                    if (isClickInProgress) return; // Don't interfere with cursor placement
                    const hasStructuralChange = mutations.some(m => m.type === 'childList' || (m.type === 'attributes' && m.attributeName === 'class'));
                    if (hasStructuralChange) {
                        fixPlaceholderOverlap();
                    }
                });
                observer.observe(editor, { attributes: true, childList: true, subtree: true, characterData: true });

                //Set BlockSuite's internal theme
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

                        // Auto-append trailing paragraph if last block is an image
                        try {
                            const noteBlock = targetDoc.getBlockByFlavour('affine:note')[0];
                            if (noteBlock && (noteBlock as any).children?.length > 0) {
                                const children = (noteBlock as any).children;
                                const lastChildId = children[children.length - 1];
                                const lastChild = targetDoc.getBlock(lastChildId);
                                if ((lastChild as any)?.flavour === 'affine:image') {
                                    targetDoc.addBlock('affine:paragraph', {}, noteBlock.id);
                                }
                            }
                        } catch (e) {}

                        const customBlobs: Record<string, string> = {};
                        try {
                            const blobSync = (collection as any).blobSync;
                            if (blobSync) {
                                const blocks = targetDoc.getBlocks();
                                for (const block of Object.values(blocks)) {
                                    const anyBlock = block as any;
                                    if (anyBlock.flavour === 'affine:image' && anyBlock.model?.sourceId) {
                                        const sourceId = anyBlock.model.sourceId;
                                        if (sourceId) {
                                            try {
                                                const blob = await blobSync.get(sourceId);
                                                if (blob) {
                                                    const b = blob instanceof Blob ? blob : new Blob([blob]);
                                                    const reader = new FileReader();
                                                    reader.readAsDataURL(b);
                                                    await new Promise(r => reader.onload = r);
                                                    customBlobs[sourceId] = reader.result as string;
                                                }
                                            } catch (e) {}
                                        }
                                    }
                                }
                            }
                        } catch (e) {}
                        
                        // Append our custom blobs for storage
                        (snapshot as any).customBlobs = customBlobs;

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
