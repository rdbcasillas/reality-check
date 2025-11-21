import { useState, useEffect, useRef } from 'react';
import { Clock, Play, Square, AlertCircle } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const TASK_TYPES = {
  months: {
    title: "Mental Sort: Months",
    description: "Write the 12 months of the year in alphabetical order",
    instruction: "Write all 12 months in alphabetical order on paper"
  },
  alphaNumeric: {
    title: "Alpha-Numeric Sequence",
    description: "Write A-1, B-2, C-3... through Z-26",
    instruction: "Write the sequence A-1, B-2, C-3... all the way to Z-26"
  }
};

function App() {
  const [step, setStep] = useState('setup'); // setup, prediction, action, results
  const [taskType, setTaskType] = useState('months');
  const [estimate, setEstimate] = useState('');
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [actualTime, setActualTime] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [monthsAnswers, setMonthsAnswers] = useState(
    Array(12).fill({ month: '', letters: '' })
  );
  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');

  const timerRef = useRef(null);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 0.1);
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const validateEstimate = () => {
    if (!estimate) {
      setValidationError('Please enter your estimate');
      return false;
    }

    const estimateNum = parseFloat(estimate);
    if (estimateNum <= 0) {
      setValidationError('Estimate must be a positive number');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleStartTask = () => {
    setTimer(0);
    setIsRunning(true);
  };

  const handleStopTask = async () => {
    setIsRunning(false);
    const finalTime = parseFloat(timer.toFixed(1));
    setActualTime(finalTime);

    // Calculate results
    const estimateNum = parseFloat(estimate);
    const errorRatio = (finalTime / estimateNum).toFixed(2);
    const errorPercent = (((finalTime - estimateNum) / estimateNum) * 100).toFixed(1);

    const resultsData = {
      actualTime: finalTime,
      estimatedTime: estimateNum,
      errorRatio,
      errorPercent
    };

    setResults(resultsData);

    // Save to Firebase
    try {
      const userId = auth.currentUser?.uid || 'anonymous';
      await addDoc(collection(db, 'calibration_results'), {
        userId,
        taskType,
        estimate: estimateNum,
        actualTime: finalTime,
        userAnswer: taskType === 'months' ? JSON.stringify(monthsAnswers) : userAnswer,
        errorRatio,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving to Firebase:', error);
    }

    setStep('results');
  };

  const resetApp = () => {
    setStep('setup');
    setTaskType('months');
    setEstimate('');
    setTimer(0);
    setIsRunning(false);
    setActualTime(0);
    setUserAnswer('');
    setMonthsAnswers(Array(12).fill({ month: '', letters: '' }));
    setResults(null);
    setValidationError('');
  };

  const updateMonthAnswer = (index, field, value) => {
    setMonthsAnswers(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-2">
            RealityCheck
          </h1>
          <p className="text-gray-600">Defeating the Planning Fallacy</p>
        </div>

        {/* Setup Step */}
        {step === 'setup' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Choose Your Challenge
            </h2>

            <div className="space-y-3">
              {Object.entries(TASK_TYPES).map(([key, task]) => (
                <button
                  key={key}
                  onClick={() => setTaskType(key)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left min-h-[44px] ${
                    taskType === key
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-lg">{task.title}</div>
                  <div className="text-sm text-gray-600">{task.description}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('prediction')}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              Next: Make Your Prediction
            </button>
          </div>
        )}

        {/* Prediction Step */}
        {step === 'prediction' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                How long will it take?
              </h2>
              <p className="text-gray-600">
                {TASK_TYPES[taskType].instruction}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Estimate (seconds)
                </label>
                <input
                  type="number"
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  placeholder="e.g., 30"
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-xl text-center"
                  min="0"
                  step="1"
                />
              </div>

              {validationError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={20} />
                  <span className="text-sm">{validationError}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('setup')}
                className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors min-h-[44px]"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (validateEstimate()) {
                    setStep('action');
                  }
                }}
                className="flex-1 bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                Lock In & Start
              </button>
            </div>
          </div>
        )}

        {/* Action Step */}
        {step === 'action' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                {TASK_TYPES[taskType].instruction}
              </h2>
              <p className="text-gray-600 mb-6">
                Click Start when ready, then Stop when finished
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Clock className="text-blue-600" size={32} />
                <div className="text-6xl font-mono font-bold text-blue-900">
                  {timer.toFixed(1)}s
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {!isRunning && timer === 0 && (
                <button
                  onClick={handleStartTask}
                  className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Play size={24} />
                  Start Timer
                </button>
              )}

              {isRunning && (
                <button
                  onClick={handleStopTask}
                  className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Square size={24} />
                  Stop Timer
                </button>
              )}
            </div>

            {/* Input area based on task type */}
            {taskType === 'months' ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">Enter each month alphabetically with its letter count:</p>
                <div className="grid gap-2">
                  {monthsAnswers.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                      <input
                        type="text"
                        value={item.month}
                        onChange={(e) => updateMonthAnswer(index, 'month', e.target.value)}
                        placeholder="Month"
                        className="flex-1 p-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={item.letters}
                        onChange={(e) => updateMonthAnswer(index, 'letters', e.target.value)}
                        placeholder="#"
                        className="w-14 p-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-center"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Write your answer here: A-1, B-2, C-3..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                rows="6"
              />
            )}
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && results && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Reality Check Complete
              </h2>
            </div>

            {/* Main comparison */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Your Estimate</div>
                  <div className="text-4xl font-bold text-blue-600">
                    {results.estimatedTime}s
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Actual Time</div>
                  <div className="text-4xl font-bold text-indigo-600">
                    {results.actualTime}s
                  </div>
                </div>
              </div>
            </div>

            {/* Error metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Error</div>
                <div className={`text-2xl font-bold ${
                  parseFloat(results.errorPercent) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {results.errorPercent > 0 ? '+' : ''}{results.errorPercent}%
                </div>
              </div>
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Multiplier</div>
                <div className="text-2xl font-bold text-purple-600">
                  {results.errorRatio}x
                </div>
              </div>
            </div>

            {/* Interpretation */}
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700">
              <strong>What does this mean?</strong> The Planning Fallacy is our tendency to underestimate
              how long tasks will take. A multiplier above 1.0x means you took longer than expected.
            </div>

            <button
              onClick={resetApp}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              Try Another Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
