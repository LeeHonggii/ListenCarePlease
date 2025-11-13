import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SpeakerInfoConfirmPage() {
  const { fileId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [speakerInfo, setSpeakerInfo] = useState(null)
  const [speakerCount, setSpeakerCount] = useState(3)
  const [detectedNames, setDetectedNames] = useState([])
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    fetchSpeakerInfo()
  }, [fileId])

  const fetchSpeakerInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/speaker-info/${fileId}`)
      setSpeakerInfo(response.data)
      setSpeakerCount(response.data.speaker_count)
      setDetectedNames(response.data.detected_names)
      setLoading(false)
    } catch (error) {
      console.error('화자 정보 조회 실패:', error)
      setLoading(false)
    }
  }

  const handleAddName = () => {
    setDetectedNames([...detectedNames, ''])
  }

  const handleRemoveName = (index) => {
    setDetectedNames(detectedNames.filter((_, i) => i !== index))
  }

  const handleNameChange = (index, value) => {
    const updated = [...detectedNames]
    updated[index] = value
    setDetectedNames(updated)
  }

  const handleConfirm = async () => {
    try {
      // 화자 정보 저장
      await axios.post(`${API_BASE_URL}/api/v1/speaker-info/confirm`, {
        file_id: fileId,
        speaker_count: speakerCount,
        detected_names: detectedNames.filter(name => name.trim() !== '')
      })

      // 다음 단계 (AI 분석 중 페이지)로 이동
      navigate(`/analyzing/${fileId}`)
    } catch (error) {
      console.error('화자 정보 저장 실패:', error)
      alert('화자 정보 저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 transition-colors duration-300 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">화자 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 transition-colors duration-300 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            화자 정보 확인
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            시스템이 분석한 화자 정보를 확인해주세요
          </p>
        </div>

        {/* 메인 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
          {/* 화자 수 섹션 */}
          <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🎤 화자 수
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  수정하기
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={speakerCount}
                    onChange={(e) => setSpeakerCount(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <span className="text-gray-700">명</span>
                </div>
              ) : (
                <div className="text-4xl font-bold text-indigo-600">
                  {speakerCount}명
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-2">
              대화에 참여한 화자의 수입니다
            </p>
          </div>

          {/* 감지된 이름 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                👥 감지된 이름
              </h2>
              {isEditing && (
                <button
                  onClick={handleAddName}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  + 이름 추가
                </button>
              )}
            </div>

            <div className="space-y-3">
              {detectedNames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>감지된 이름이 없습니다</p>
                  <p className="text-sm mt-1">대화에서 이름이 언급되지 않았을 수 있습니다</p>
                </div>
              ) : (
                detectedNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                          placeholder="이름 입력"
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => handleRemoveName(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          삭제
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium">
                        {name}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <p className="text-sm text-gray-500 mt-4">
              💡 대화에서 언급된 이름들입니다. 수정이 필요하면 위의 "수정하기" 버튼을 클릭하세요.
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-4">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  // 원래 값으로 복구
                  setSpeakerCount(speakerInfo.speaker_count)
                  setDetectedNames(speakerInfo.detected_names)
                  setIsEditing(false)
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  // 수정 사항 저장
                  try {
                    await axios.post(`${API_BASE_URL}/api/v1/speaker-info/confirm`, {
                      file_id: fileId,
                      speaker_count: speakerCount,
                      detected_names: detectedNames.filter(name => name.trim() !== '')
                    })
                    setIsEditing(false)
                  } catch (error) {
                    console.error('저장 실패:', error)
                    alert('저장에 실패했습니다.')
                  }
                }}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                저장
              </button>
            </>
          ) : (
            <button
              onClick={handleConfirm}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 text-lg"
            >
              확인 완료 → 화자 태깅하기
            </button>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ℹ️ 다음 단계에서는 각 화자(SPEAKER_00, SPEAKER_01...)에게 실제 이름을 매핑합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
