
export interface Note {
  id: string;
  title: string;
  content: string; // HTML content from Quill (or BlockSuite export)
  createdAt: number;
  updatedAt: number;
  cloudSlug?: string; // ID for the shared version in Firebase
  blockSuiteData?: any; // Store the full BlockSuite snapshot here for high-fidelity editing
}
