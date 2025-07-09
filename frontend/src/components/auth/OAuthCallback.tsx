import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { setUser } = useAuth() as any; // Type assertion for setUser

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        // Verify state parameter
        const storedState = localStorage.getItem('oauthState');
        if (state !== storedState) {
          throw new Error('Invalid state parameter');
        }

        // Exchange code for tokens
        const response = await fetch(`${API_BASE_URL}/oauth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
            redirect_uri: `${window.location.origin}/auth/callback`,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'OAuth callback failed');
        }

        // Store tokens
        localStorage.setItem('accessToken', result.data.tokens.accessToken);
        localStorage.setItem('refreshToken', result.data.tokens.refreshToken);

        // Clear OAuth state
        localStorage.removeItem('oauthState');

        // Update user context
        if (setUser) {
          setUser(result.data.user);
        }

        setStatus('success');

        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);

      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'OAuth authentication failed');
        setStatus('error');

        // Redirect to home page after error
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completing authentication...
          </h2>
          <p className="text-gray-600">
            Please wait while we sign you in.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication successful!
          </h2>
          <p className="text-gray-600 mb-4">
            Redirecting you to the dashboard...
          </p>
          <div className="animate-pulse">
            <div className="h-2 bg-indigo-200 rounded-full w-64 mx-auto">
              <div className="h-2 bg-indigo-600 rounded-full w-32 animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Authentication failed
        </h2>
        <p className="text-gray-600 mb-4">
          {error}
        </p>
        <p className="text-sm text-gray-500">
          Redirecting you back to the home page...
        </p>
      </div>
    </div>
  );
};