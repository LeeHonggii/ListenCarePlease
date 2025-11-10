import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 파일 업로드
export const uploadAudioFile = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/v1/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });

  return response.data;
};

// 파일 상태 조회
export const getFileStatus = async (fileId) => {
  const response = await api.get(`/api/v1/files/${fileId}`);
  return response.data;
};

// 파일 삭제
export const deleteFile = async (fileId) => {
  const response = await api.delete(`/api/v1/files/${fileId}`);
  return response.data;
};

export default api;
