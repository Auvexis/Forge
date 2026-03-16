export const GoogleDriveMethods = {
  /**
   * Get methods
   */
  listFiles: async (params: {
    folderId?: string;
    pageSize?: number;
    query?: string;
  }) => {},
  searchFiles: async (params: { query: string }) => {},
  getFileMetadata: async (params: { fileId: string }) => {},

  /**
   * File methods
   */
  uploadFile: async (params: {
    name: string;
    content: string;
    folderId?: string;
    mimeType?: string;
  }) => {},
  downloadFile: async (params: { fileId: string }) => {},
  deleteFile: async (params: { fileId: string }) => {},

  /**
   * Folder methods
   */
  createFolder: async (params: { name: string; parentId?: string }) => {},
  deleteFolder: async (params: { folderId: string }) => {},
  downloadFolder: async (params: { folderId: string }) => {},
};
