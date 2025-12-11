import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Users, Target, TrendingUp, Award } from 'lucide-react';

export default function AdminDashboard({ onBack }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    avgError: 0,
    avgPredicted: 0,
    avgActual: 0,
    underestimators: 0,
    overestimators: 0,
    perfectPredictions: 0,
  });

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const q = query(collection(db, 'calibration_results'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);

      const data = querySnapshot.docs
        .map(doc => {
          const docData = doc.data();

          // Handle new format (countdown_months)
          if (docData.taskType === 'countdown_months') {
            const predictedMonths = Number(docData.predictedMonths);
            const actualMonths = Number(docData.actualMonths);

            if (isNaN(predictedMonths) || isNaN(actualMonths)) {
              return null;
            }

            return {
              id: doc.id,
              ...docData,
              predictedMonths,
              actualMonths,
              error: actualMonths - predictedMonths,
              errorPercentage: predictedMonths > 0 ? ((actualMonths - predictedMonths) / predictedMonths) * 100 : 0,
            };
          }

          // Ignore old format data
          return null;
        })
        .filter(record => record !== null);

      setResults(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (data.length === 0) {
      setStats({
        totalParticipants: 0,
        avgError: 0,
        avgPredicted: 0,
        avgActual: 0,
        underestimators: 0,
        overestimators: 0,
        perfectPredictions: 0,
      });
      return;
    }

    const validData = data.filter(r =>
      !isNaN(r.error) &&
      !isNaN(r.predictedMonths) &&
      !isNaN(r.actualMonths)
    );

    if (validData.length === 0) {
      setStats({
        totalParticipants: data.length,
        avgError: 0,
        avgPredicted: 0,
        avgActual: 0,
        underestimators: 0,
        overestimators: 0,
        perfectPredictions: 0,
      });
      return;
    }

    const totalError = validData.reduce((sum, r) => sum + Math.abs(r.error), 0);
    const totalPredicted = validData.reduce((sum, r) => sum + r.predictedMonths, 0);
    const totalActual = validData.reduce((sum, r) => sum + r.actualMonths, 0);
    const underestimators = validData.filter(r => r.error > 0).length; // Did better than expected
    const overestimators = validData.filter(r => r.error < 0).length; // Did worse than expected
    const perfectPredictions = validData.filter(r => r.error === 0).length;

    setStats({
      totalParticipants: validData.length,
      avgError: totalError / validData.length,
      avgPredicted: totalPredicted / validData.length,
      avgActual: totalActual / validData.length,
      underestimators,
      overestimators,
      perfectPredictions,
    });
  };

  const getErrorDistributionData = () => {
    const bins = [
      { range: '-6 or less', min: -Infinity, max: -5, count: 0 },
      { range: '-5 to -4', min: -5, max: -3, count: 0 },
      { range: '-3 to -2', min: -3, max: -1, count: 0 },
      { range: '-1', min: -1, max: 0, count: 0 },
      { range: 'Perfect (0)', min: 0, max: 1, count: 0 },
      { range: '+1', min: 1, max: 2, count: 0 },
      { range: '+2 to +3', min: 2, max: 4, count: 0 },
      { range: '+4 to +5', min: 4, max: 6, count: 0 },
      { range: '+6 or more', min: 6, max: Infinity, count: 0 },
    ];

    results.forEach(r => {
      const bin = bins.find(b => r.error >= b.min && r.error < b.max);
      if (bin) bin.count++;
    });

    return bins;
  };

  const getScatterData = () => {
    return results.map(r => ({
      predicted: r.predictedMonths,
      actual: r.actualMonths,
      error: r.error,
    }));
  };

  const getBarColor = (range) => {
    if (range.includes('Perfect')) return '#f59e0b'; // amber for perfect
    if (range.includes('+')) return '#10b981'; // green for underestimated (did better)
    return '#ef4444'; // red for overestimated (did worse)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Workshop
        </button>

        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-slate-400 mb-8">Countdown Edition - Planning Fallacy Workshop Results</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-blue-400" size={24} />
              <h3 className="text-slate-400 text-sm">Total Participants</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalParticipants}</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Target className="text-amber-400" size={24} />
              <h3 className="text-slate-400 text-sm">Avg Predicted</h3>
            </div>
            <p className="text-3xl font-bold">{stats.avgPredicted.toFixed(1)}</p>
            <p className="text-xs text-slate-500 mt-1">months</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-400" size={24} />
              <h3 className="text-slate-400 text-sm">Avg Actual</h3>
            </div>
            <p className="text-3xl font-bold">{stats.avgActual.toFixed(1)}</p>
            <p className="text-xs text-slate-500 mt-1">months</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Award className="text-purple-400" size={24} />
              <h3 className="text-slate-400 text-sm">Perfect Predictions</h3>
            </div>
            <p className="text-3xl font-bold">{stats.perfectPredictions}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.totalParticipants > 0 ? ((stats.perfectPredictions / stats.totalParticipants) * 100).toFixed(0) : 0}% of participants
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4">Prediction Accuracy Distribution</h2>
            <p className="text-slate-400 text-sm mb-4">
              How participants' predictions compared to actual performance
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getErrorDistributionData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="range"
                  stroke="#94a3b8"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={11}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" fill="#8884d8">
                  {getErrorDistributionData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.range)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Better than predicted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span>Perfect</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Worse than predicted</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4">Predicted vs Actual Months</h2>
            <p className="text-slate-400 text-sm mb-4">
              Each dot represents one participant
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  type="number"
                  dataKey="predicted"
                  name="Predicted"
                  stroke="#94a3b8"
                  domain={[0, 12]}
                  label={{ value: 'Predicted Months', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                />
                <YAxis
                  type="number"
                  dataKey="actual"
                  name="Actual"
                  stroke="#94a3b8"
                  domain={[0, 12]}
                  label={{ value: 'Actual Months', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value) => [`${value} months`, '']}
                />
                <Scatter data={getScatterData()} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold mb-4">Calibration Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-400">{stats.underestimators}</p>
              <p className="text-slate-400 mt-2">Better Than Predicted</p>
              <p className="text-xs text-slate-500 mt-1">
                ({stats.totalParticipants > 0 ? ((stats.underestimators / stats.totalParticipants) * 100).toFixed(0) : 0}%)
              </p>
              <p className="text-xs text-slate-600 mt-2">Completed more months than they thought</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-amber-400">{stats.perfectPredictions}</p>
              <p className="text-slate-400 mt-2">Perfect Calibration</p>
              <p className="text-xs text-slate-500 mt-1">
                ({stats.totalParticipants > 0 ? ((stats.perfectPredictions / stats.totalParticipants) * 100).toFixed(0) : 0}%)
              </p>
              <p className="text-xs text-slate-600 mt-2">Predicted exactly right</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-red-400">{stats.overestimators}</p>
              <p className="text-slate-400 mt-2">Overestimated Ability</p>
              <p className="text-xs text-slate-500 mt-1">
                ({stats.totalParticipants > 0 ? ((stats.overestimators / stats.totalParticipants) * 100).toFixed(0) : 0}%)
              </p>
              <p className="text-xs text-slate-600 mt-2">Completed fewer months than predicted</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mt-8">
          <h2 className="text-xl font-bold mb-4">Individual Results</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4">Predicted</th>
                  <th className="text-left py-3 px-4">Actual</th>
                  <th className="text-left py-3 px-4">Difference</th>
                  <th className="text-left py-3 px-4">Accuracy</th>
                  <th className="text-left py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4">{result.predictedMonths} months</td>
                    <td className="py-3 px-4">{result.actualMonths} months</td>
                    <td className={`py-3 px-4 font-semibold ${
                      result.error > 0 ? 'text-green-400' : result.error < 0 ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {result.error > 0 ? '+' : ''}{result.error}
                    </td>
                    <td className="py-3 px-4">
                      {result.error === 0 ? (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">Perfect!</span>
                      ) : (
                        <span className="text-slate-400">
                          {Math.abs(result.errorPercentage).toFixed(0)}% off
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {result.timestamp?.toDate?.().toLocaleString() || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
