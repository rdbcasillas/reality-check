import { useState, useEffect, useRef } from 'react';
import { Clock, Play, Square, AlertCircle } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const TASK_TYPES = {
  months: {
    title: "Mental Sort: Months",
    description: "Write the 12 months of the year in alphabetical order",
    instruction: "Write all 12 months in alphabetical order"
  }
};

// Correct answers in alphabetical order
const CORRECT_MONTHS = [
  'April', 'August', 'December', 'February', 'January', 'July',
  'June', 'March', 'May', 'November', 'October', 'September'
];

const CORRECT_LETTER_COUNTS = [5, 6, 8, 8, 7, 4, 4, 5, 3, 8, 7, 9];

function App() {
  const [step, setStep] = useState('setup'); // setup, prediction, action, results
  const [taskType, setTaskType] = useState('months');
  const [estimate, setEstimate] = useState('');
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [actualTime, setActualTime] = useState(0);
  const [monthsAnswers, setMonthsAnswers] = useState(
    Array(12).fill({ month: '', letters: '' })
  );
  const [currentUnlockedIndex, setCurrentUnlockedIndex] = useState(0);
  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);

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
        monthsAnswers,
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
    setMonthsAnswers(Array(12).fill({ month: '', letters: '' }));
    setCurrentUnlockedIndex(0);
    setResults(null);
    setValidationError('');
  };

  const updateMonthAnswer = (index, field, value) => {
    const newAnswers = [...monthsAnswers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setMonthsAnswers(newAnswers);

    // Check if both month and letter count are correct
    const isMonthCorrect = newAnswers[index].month === CORRECT_MONTHS[index];
    const letterCount = parseInt(newAnswers[index].letters);
    const isLetterCountCorrect = !isNaN(letterCount) && letterCount === CORRECT_LETTER_COUNTS[index];

    // Unlock next row only when both are correct
    if (isMonthCorrect && isLetterCountCorrect && index < 11) {
      setCurrentUnlockedIndex(index + 1);
    }
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
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Today's Challenge
              </h2>
              <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-6">
                <div className="font-semibold text-xl text-blue-900 mb-2">
                  Mental Sort: Months
                </div>
                <p className="text-gray-700">
                  Write the 12 months of the year in alphabetical order
                </p>
              </div>
              <p className="text-gray-600">
                First, you'll estimate how long this will take. Then we'll time you!
              </p>
            </div>

            <button
              onClick={() => setStep('prediction')}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors min-h-[44px] text-lg"
            >
              Begin Challenge
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

            {/* List of months in chronological order */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">The 12 months:</p>
              <div className="grid grid-cols-3 gap-2 text-sm text-gray-700">
                <span>January</span>
                <span>February</span>
                <span>March</span>
                <span>April</span>
                <span>May</span>
                <span>June</span>
                <span>July</span>
                <span>August</span>
                <span>September</span>
                <span>October</span>
                <span>November</span>
                <span>December</span>
              </div>
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
                  onClick={() => setShowStopConfirmation(true)}
                  className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Square size={24} />
                  Stop Timer
                </button>
              )}
            </div>

            {/* Input area */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">
                {timer === 0 && !isRunning
                  ? 'Click "Start Timer" to begin entering your answers!'
                  : 'Enter each month alphabetically (capital first letter) and its letter count. Complete both to unlock the next row!'}
              </p>
              <div className="grid gap-2">
                {monthsAnswers.map((item, index) => {
                  const hasStarted = timer > 0 || isRunning;
                  const isUnlocked = index <= currentUnlockedIndex;
                  const isMonthCorrect = item.month === CORRECT_MONTHS[index];
                  const letterCount = parseInt(item.letters);
                  const isLetterCountCorrect = !isNaN(letterCount) && letterCount === CORRECT_LETTER_COUNTS[index];

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                      <input
                        type="text"
                        value={item.month}
                        onChange={(e) => updateMonthAnswer(index, 'month', e.target.value)}
                        placeholder="Month"
                        disabled={!hasStarted || !isUnlocked}
                        className={`flex-1 p-2 border-2 rounded-lg focus:outline-none transition-colors ${
                          !hasStarted || !isUnlocked
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : isMonthCorrect
                            ? 'border-green-500 bg-green-50 text-green-900'
                            : 'border-gray-300 focus:border-blue-600'
                        }`}
                      />
                      <input
                        type="number"
                        value={item.letters}
                        onChange={(e) => updateMonthAnswer(index, 'letters', e.target.value)}
                        placeholder="#"
                        disabled={!hasStarted || !isMonthCorrect}
                        className={`w-14 p-2 border-2 rounded-lg focus:outline-none text-center transition-colors ${
                          !hasStarted || !isMonthCorrect
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : isLetterCountCorrect
                            ? 'border-green-500 bg-green-50 text-green-900'
                            : 'border-gray-300 focus:border-blue-600'
                        }`}
                        min="0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Stop Timer Confirmation Modal */}
        {showStopConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Stop Timer?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to stop the timer? Your results will be saved and you'll move to the results screen.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStopConfirmation(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowStopConfirmation(false);
                    handleStopTask();
                  }}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors min-h-[44px]"
                >
                  Yes, Stop Timer
                </button>
              </div>
            </div>
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
