import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ko';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { extractTodos, getTodos, deleteTodo } from '../services/api';
import './TodoPage.css';

// moment 한국어 설정
moment.locale('ko');
const localizer = momentLocalizer(moment);

const TodoPage = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [todos, setTodos] = useState([]);
  const [filename, setFilename] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // TODO 조회
  const fetchTodos = async () => {
    try {
      setLoading(true);
      const data = await getTodos(fileId);
      setFilename(data.original_filename);
      setMeetingDate(data.meeting_date);

      // 캘린더 이벤트 형식으로 변환
      const events = data.todos.map(todo => ({
        id: todo.id,
        title: `[${todo.priority}] ${todo.task}`,
        start: new Date(todo.due_date),
        end: new Date(todo.due_date),
        resource: {
          assignee: todo.assignee,
          priority: todo.priority,
          task: todo.task
        }
      }));

      setTodos(events);
    } catch (error) {
      console.error('TODO 조회 실패:', error);
      alert('TODO를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // TODO 추출
  const handleExtractTodos = async () => {
    if (!confirm('회의록에서 TODO를 추출하시겠습니까?\n기존 TODO는 삭제됩니다.')) {
      return;
    }

    try {
      setExtracting(true);
      await extractTodos(fileId);
      alert('TODO 추출이 완료되었습니다!');
      fetchTodos();
    } catch (error) {
      console.error('TODO 추출 실패:', error);
      alert('TODO 추출에 실패했습니다.');
    } finally {
      setExtracting(false);
    }
  };

  // TODO 삭제
  const handleDeleteTodo = async (todoId) => {
    if (!confirm('이 TODO를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteTodo(fileId, todoId);
      alert('TODO가 삭제되었습니다.');
      fetchTodos();
      setSelectedEvent(null);
    } catch (error) {
      console.error('TODO 삭제 실패:', error);
      alert('TODO 삭제에 실패했습니다.');
    }
  };

  // 이벤트 선택 핸들러
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  // 이벤트 스타일
  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad';

    if (event.resource.priority === 'High') {
      backgroundColor = '#ef4444'; // 빨강
    } else if (event.resource.priority === 'Medium') {
      backgroundColor = '#f59e0b'; // 주황
    } else {
      backgroundColor = '#10b981'; // 녹색
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  useEffect(() => {
    fetchTodos();
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">TODO를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">📋 TODO 캘린더</h1>
        <p className="text-gray-600 dark:text-gray-300">
          파일: <span className="font-medium">{filename}</span> |
          회의 날짜: <span className="font-medium">{meetingDate}</span>
        </p>
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleExtractTodos}
          disabled={extracting}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            extracting
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-accent-sage dark:bg-accent-teal hover:opacity-90 text-gray-900 dark:text-white'
          }`}
        >
          {extracting ? '추출 중...' : '🔄 TODO 추출'}
        </button>

        <button
          onClick={() => navigate(`/result/${fileId}`)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
        >
          ← 결과 페이지로
        </button>
      </div>

      {/* 캘린더 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 calendar-container" style={{ height: '600px' }}>
        {todos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-2">📭 TODO가 없습니다</p>
              <p className="text-sm">상단의 "TODO 추출" 버튼을 눌러 회의록에서 TODO를 추출하세요.</p>
            </div>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={todos}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            messages={{
              today: '오늘',
              previous: '이전',
              next: '다음',
              month: '월',
              week: '주',
              day: '일',
              agenda: '목록',
              date: '날짜',
              time: '시간',
              event: '일정',
              noEventsInRange: '이 기간에 일정이 없습니다.',
            }}
          />
        )}
      </div>

      {/* TODO 상세 정보 모달 */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">TODO 상세</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">할 일</label>
                <p className="text-gray-800 dark:text-gray-200 mt-1">{selectedEvent.resource.task}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">담당자</label>
                <p className="text-gray-800 dark:text-gray-200 mt-1">
                  {selectedEvent.resource.assignee || '미지정'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">마감일</label>
                <p className="text-gray-800 dark:text-gray-200 mt-1">
                  {moment(selectedEvent.start).format('YYYY년 MM월 DD일 HH:mm')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">우선순위</label>
                <p className="text-gray-800 dark:text-gray-200 mt-1">
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                    selectedEvent.resource.priority === 'High'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                      : selectedEvent.resource.priority === 'Medium'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {selectedEvent.resource.priority}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleDeleteTodo(selectedEvent.id)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                🗑️ 삭제
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoPage;
