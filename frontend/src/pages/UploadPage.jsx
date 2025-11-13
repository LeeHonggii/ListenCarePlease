import React from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload/FileUpload';

const UploadPage = () => {
  const navigate = useNavigate();

  const handleUploadSuccess = (result) => {
    console.log('Upload success:', result);
    // 업로드 성공 후 처리 페이지로 이동
    navigate(`/processing/${result.file_id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              🎙️ ListenCarePlease
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              발화자 자동 태깅 및 음성 요약 서비스
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              회의 녹음 파일을 업로드하세요
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              AI가 자동으로 화자를 분리하고 태깅해드립니다
            </p>
          </div>

          <FileUpload onUploadSuccess={handleUploadSuccess} />

          {/* Features */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">정확한 화자 분리</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                AI 기술로 여러 화자를 정확하게 구분합니다
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">빠른 처리</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                최적화된 알고리즘으로 신속하게 분석합니다
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">자동 요약</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                회의 내용을 자동으로 요약해드립니다
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Phase 1: 웹 인프라 구축 완료 | 로그인 없이 테스트 가능
          </p>
        </div>
      </footer>
    </div>
  );
};

export default UploadPage;
