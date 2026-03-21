import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StartExamModal from '../components/StartExamModal';

const QuizSearch = () => {
  const [quizCode, setQuizCode] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!quizCode) {
      alert('Vui lòng nhập mã đề thi.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/quizzes/code/${quizCode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không tìm thấy đề thi.');
      }

      // Navigate with DeThiId instead of code
      setQuizCode('');
      setSelectedQuiz(data.data);
      setShowStartModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px'
    }}>
      <h1>Tìm kiếm Đề Thi</h1>
      <p>Nhập mã đề thi để bắt đầu làm bài:</p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <input
          type="text"
          placeholder="Mã đề thi"
          value={quizCode}
          onChange={(e) => setQuizCode(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button
          onClick={handleSearch}
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007BFF', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Tìm kiếm
        </button>
      </div>

      {showStartModal && (
        <StartExamModal 
          quiz={selectedQuiz} 
          onClose={() => setShowStartModal(false)} 
        />
      )}
    </div>
  );
};

export default QuizSearch;
