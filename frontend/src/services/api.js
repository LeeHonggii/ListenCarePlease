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

// 파일 처리 시작
export const startProcessing = async (fileId, whisperMode, diarizationMode) => {
  const params = new URLSearchParams();
  if (whisperMode) params.append('whisper_mode', whisperMode);
  if (diarizationMode) params.append('diarization_mode', diarizationMode);

  const response = await api.post(`/api/v1/process/${fileId}?${params.toString()}`);
  return response.data;
};

// 처리 상태 조회
export const getProcessingStatus = async (fileId) => {
  const response = await api.get(`/api/v1/status/${fileId}`);
  return response.data;
};

// 최종 결과 조회
export const getTranscript = async (fileId) => {
  const response = await api.get(`/api/v1/transcript/${fileId}`);
  return response.data;
};

// NER 결과 조회
export const getNERResult = async (fileId) => {
  const response = await api.get(`/api/v1/ner/${fileId}`);
  return response.data;
};

// 병합된 결과 조회 (STT + Diarization + NER)
export const getMergedResult = async (fileId) => {
  const response = await api.get(`/api/v1/merged/${fileId}`);
  return response.data;
};

export default api;
