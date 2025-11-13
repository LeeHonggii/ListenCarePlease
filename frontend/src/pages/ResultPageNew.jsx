import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ResultPageNew() {
  const { fileId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchResult()
  }, [fileId])

  const fetchResult = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/tagging/${fileId}/result`)
      setData(response.data)

      // 통계 계산
      calculateStats(response.data)
      setLoading(false)
    } catch (error) {
      console.error('결과 조회 실패:', error)
      setLoading(false)
    }
  }

  const calculateStats = (resultData) => {
    const speakerStats = {}

    resultData.final_transcript.forEach((segment) => {
      const speaker = segment.speaker_name
      const duration = segment.end_time - segment.start_time

      if (!speakerStats[speaker]) {
        speakerStats[speaker] = {
          count: 0,
          totalDuration: 0
        }
      }

      speakerStats[speaker].count += 1
      speakerStats[speaker].totalDuration += duration
    })

    setStats(speakerStats)
  }

  const handleDownload = () => {
    if (!data) return

    const text = data.final_transcript
      .map(seg => `[${formatTime(seg.start_time)} - ${formatTime(seg.end_time)}] ${seg.speaker_name}:\n${seg.text}\n`)
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `회의록_${fileId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}분 ${secs}초`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 transition-colors duration-300 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 transition-colors duration-300 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            회의록 완성! 🎉
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            화자 태깅이 완료되었습니다. 다음 단계를 선택하세요.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats && Object.entries(stats).map(([speaker, stat]) => (
            <div key={speaker} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{speaker}</h3>
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {Object.keys(stats).indexOf(speaker) + 1}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">🗣️ 발화 횟수</span>
                  <span className="text-2xl font-bold text-indigo-600">{stat.count}회</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">⏱️ 발화 시간</span>
                  <span className="text-lg font-semibold text-purple-600">
                    {formatDuration(stat.totalDuration)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 전체 회의록 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📝 전체 회의록</h2>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              다운로드
            </button>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {data?.final_transcript.map((segment, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">{segment.speaker_name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{segment.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 다음 단계 선택 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            🚀 다음 단계를 선택하세요
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 요약 생성 */}
            <button
              onClick={() => navigate(`/summary/${fileId}`)}
              className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/50 dark:hover:to-blue-800/50 rounded-xl border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all transform hover:scale-105 shadow-md hover:shadow-xl"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">✨</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">요약 생성</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                AI가 회의 내용을 핵심 포인트로 요약해드립니다
              </p>
            </button>

            {/* RAG 대화 */}
            <button
              onClick={() => navigate(`/rag/${fileId}`)}
              className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/50 dark:hover:to-purple-800/50 rounded-xl border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all transform hover:scale-105 shadow-md hover:shadow-xl"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">💬</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">RAG 대화</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                회의 내용에 대해 질문하고 답변을 받아보세요
              </p>
            </button>

            {/* 자막 생성 */}
            <button
              onClick={() => navigate(`/subtitle/${fileId}`)}
              className="group p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/50 dark:hover:to-green-800/50 rounded-xl border-2 border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 transition-all transform hover:scale-105 shadow-md hover:shadow-xl"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎬</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">자막 생성</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                SRT/VTT 형식의 자막 파일을 생성합니다
              </p>
            </button>
          </div>

          {/* 추가 옵션 */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              🏠 처음으로
            </button>
            <button
              onClick={() => navigate(`/tagging/${fileId}`)}
              className="px-6 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 rounded-lg font-semibold transition-colors"
            >
              ✏️ 태깅 수정
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
