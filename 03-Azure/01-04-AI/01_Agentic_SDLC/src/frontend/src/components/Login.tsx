import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { demoUsers, useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { darkMode } = useTheme();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const errorMsg = searchParams.get('error');
    if (errorMsg) {
      setError(errorMsg);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/');
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div
      className={`min-h-screen pt-20 ${darkMode ? 'bg-dark' : 'bg-gray-100'} flex items-center justify-center px-4 transition-colors duration-300`}
    >
      <div
        className={`max-w-4xl w-full ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8 transition-colors duration-300`}
      >
        <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
          <div>
            <h2
              className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} mb-6 transition-colors duration-300`}
            >
              Login
            </h2>

            {error && (
              <div
                className="bg-red-500/10 border border-red-500 text-red-500 rounded-md p-3 mb-4"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className={`block ${darkMode ? 'text-light' : 'text-gray-700'} mb-2 transition-colors duration-300`}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full ${darkMode ? 'bg-gray-700 text-light' : 'bg-gray-100 text-gray-800'} rounded px-3 py-2 transition-colors duration-300`}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className={`block ${darkMode ? 'text-light' : 'text-gray-700'} mb-2 transition-colors duration-300`}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full ${darkMode ? 'bg-gray-700 text-light' : 'bg-gray-100 text-gray-800'} rounded px-3 py-2 transition-colors duration-300`}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-accent text-white py-2 px-4 rounded transition-colors"
              >
                Login
              </button>
            </form>
          </div>

          <div className={darkMode ? 'text-light' : 'text-gray-800'}>
            <h3 className="text-xl font-semibold mb-4">Demo users</h3>
            <div className="overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
              <table className="min-w-full text-left text-sm">
                <thead className={darkMode ? 'bg-gray-700 text-light' : 'bg-gray-100 text-gray-700'}>
                  <tr>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {demoUsers.map((user) => (
                    <tr
                      key={user.email}
                      className={darkMode ? 'border-t border-gray-600 bg-gray-800' : 'border-t border-gray-200 bg-white'}
                    >
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2 font-mono">{user.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
