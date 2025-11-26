import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardStats, getEfficiencyOverview } from '../services/api'

export default function DashboardPageNew() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('week')
  const [isLoading, setIsLoading] = useState(true)
  const [efficiencyData, setEfficiencyData] = useState(null)

  useEffect(() => {
    if (user?.id) {
      loadStats()
      loadEfficiency()
    }
  }, [user, period])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      console.log('DashboardPageNew - Loading stats for user:', user.id, 'period:', period)
      const statsData = await getDashboardStats(user.id, period)
      console.log('DashboardPageNew - Received stats:', statsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadEfficiency = async () => {
    try {
      const data = await getEfficiencyOverview(5)
      setEfficiencyData(data)
    } catch (error) {
      console.error('Failed to load efficiency data:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          대시보드
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          전체 파일 통계를 확인하세요
        </p>
      </div>

      {/* 기간 선택 */}
      <div className="mb-6 flex gap-2">
        {[
          { value: 'day', label: '오늘' },
          { value: 'week', label: '이번 주' },
          { value: 'month', label: '이번 달' },
          { value: 'all', label: '전체' }
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setPeriod(item.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === item.value
                ? 'bg-accent-sage dark:bg-accent-teal text-gray-900 dark:text-white'
                : 'bg-bg-tertiary dark:bg-bg-tertiary-dark text-gray-700 dark:text-gray-300 hover:bg-bg-accent/20'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 총 파일 수 */}
        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                총 파일 수
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.current?.total_files || 0}
              </p>
            </div>
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <svg className="w-8 h-8 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 기간별 처리 */}
        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {period === 'day' ? '오늘' : period === 'week' ? '이번 주' : period === 'month' ? '이번 달' : '전체'} 처리
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.current?.total_files || 0}
              </p>
            </div>
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <svg className="w-8 h-8 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 처리 중인 파일 */}
        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                처리 중
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.current?.processing || 0}
              </p>
            </div>
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <svg className="w-8 h-8 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 평균 처리 시간 */}
        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                평균 처리 시간
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.current?.total_duration ? `${Math.round(stats.current.total_duration / 60)}분` : '-'}
              </p>
            </div>
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <svg className="w-8 h-8 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="mt-8 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📈 최근 활동
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-bg-accent/20">
            <span className="text-gray-700 dark:text-gray-300">완료된 파일</span>
            <span className="font-semibold text-gray-900 dark:text-white">{stats?.current?.completed || 0}개</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-bg-accent/20">
            <span className="text-gray-700 dark:text-gray-300">실패한 파일</span>
            <span className="font-semibold text-gray-900 dark:text-white">{stats?.current?.failed || 0}개</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-700 dark:text-gray-300">총 처리 시간</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {stats?.current?.total_duration ? `${Math.round(stats.current.total_duration / 60)}분` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 회의 효율성 개요 */}
      {efficiencyData && efficiencyData.total_count > 0 && (
        <div className="mt-8 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            🎯 회의 효율성 분석
          </h2>
          <div className="space-y-3">
            {efficiencyData.analyses.map((analysis) => (
              <button
                key={analysis.audio_file_id}
                onClick={() => navigate(`/efficiency/${analysis.audio_file_id}`)}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-bg-secondary dark:bg-bg-secondary-dark hover:bg-bg-accent/20 dark:hover:bg-bg-accent/20 transition-colors"
              >
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {analysis.filename}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span>엔트로피: {analysis.entropy_avg?.toFixed(2) || 'N/A'}</span>
                    <span>화자: {analysis.total_speakers}명</span>
                    <span>발화: {analysis.total_turns}회</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
