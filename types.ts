
export interface Note {
  id: string;
  title: string;
  content: string; // HTML content from Quill
  createdAt: number;
  updatedAt: number;
  cloudSlug?: string; // ID for the shared version in Firebase
}
