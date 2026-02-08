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
                        const themeProvider = std.get(ThemeProvider);
                        if (themeProvider) {
                            themeProvider.app$.value = theme;
                            if (themeProvider.theme$) {
                                themeProvider.theme$.value = theme;
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
                
                // Important: Apply initial theme
                const hasDarkClass = document.documentElement.classList.contains('dark') || 
                                    document.body.classList.contains('dark');
                editor.dataset.theme = hasDarkClass ? 'dark' : 'light';
                
                // Ensure it takes full height and has no internal overflow
                editor.style.height = '100%';
                editor.style.width = '100%';
                editor.style.backgroundColor = 'transparent';
                
                containerRef.current?.appendChild(editor);
                editorRef.current = editor;

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
                                const themeProvider = std.get(ThemeProvider);
                                if (themeProvider) {
                                    themeProvider.app$.value = theme;
                                    if (themeProvider.theme$) {
                                        themeProvider.theme$.value = theme;
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
