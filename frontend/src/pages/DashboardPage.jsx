import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardStats, getRecentFiles, getProcessingFilesFromDashboard, deleteAudioFile } from '../services/api'
import StatsCards from '../components/Dashboard/StatsCards'
import RecentFilesList from '../components/Dashboard/RecentFilesList'
import ProcessingTasks from '../components/Dashboard/ProcessingTasks'
import ResultModal from '../components/Dashboard/ResultModal'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [stats, setStats] = useState(null)
  const [recentFiles, setRecentFiles] = useState([])
  const [processingFiles, setProcessingFiles] = useState([])
  const [period, setPeriod] = useState('week')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)

  // 데이터 로드
  const loadDashboardData = async () => {
    try {
      setIsLoading(true)

      // 3개 API 병렬 호출
      const [statsData, filesData, processingData] = await Promise.all([
        getDashboardStats(user.id, period),
        getRecentFiles(user.id, 10),
        getProcessingFilesFromDashboard(user.id)
      ])

      setStats(statsData)
      setRecentFiles(filesData)
      setProcessingFiles(processingData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user, period])

  // 처리 중인 파일 실시간 업데이트 (5초마다)
  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(async () => {
      try {
        const processingData = await getProcessingFilesFromDashboard(user.id)
        setProcessingFiles(processingData)

        // 처리 완료된 파일이 있으면 전체 데이터 새로고침
        if (processingData.length < processingFiles.length) {
          loadDashboardData()
        }
      } catch (error) {
        console.error('Failed to update processing files:', error)
      }
    }, 5000) // 5초마다

    return () => clearInterval(interval)
  }, [user, processingFiles.length])

  // 기간 변경 핸들러
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
  }

  // 파일 삭제 핸들러
  const handleDelete = async (fileId) => {
    try {
      await deleteAudioFile(fileId)
      loadDashboardData()
    } catch (error) {
      console.error('파일 삭제 실패:', error)
      alert('파일 삭제에 실패했습니다.')
    }
  }

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                대시보드
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                안녕하세요, {user?.full_name || user?.email}님
              </p>
            </div>
            <button
              onClick={() => navigate('/upload')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 파일 업로드
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        <StatsCards
          stats={stats}
          period={period}
          onPeriodChange={handlePeriodChange}
        />

        {/* 처리 중인 작업 */}
        {processingFiles.length > 0 && (
          <div className="mt-8">
            <ProcessingTasks files={processingFiles} />
          </div>
        )}

        {/* 최근 파일 목록 */}
        <div className="mt-8">
          <RecentFilesList
            files={recentFiles}
            onRefresh={loadDashboardData}
            onFileClick={(file) => setSelectedFile(file)}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* 결과 모달 */}
      {selectedFile && (
        <ResultModal
          fileId={selectedFile.id}
          filename={selectedFile.filename}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  )
}
