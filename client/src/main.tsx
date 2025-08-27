import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import { requireAuthOrRedirect } from './lib/api'

const Home = React.lazy(() => import('./pages/Home'))
const Category = React.lazy(() => import('./pages/Category'))
const Login = React.lazy(() => import('./pages/Login'))
const Admin = React.lazy(() => import('./pages/Admin'))
const SpeedTest = React.lazy(() => import('./pages/SpeedTest'))

function PrivateRoute({ children }: { children: React.ReactElement }) {
	const token = localStorage.getItem('token')
	if (!token) return <Navigate to="/login" replace />
	return children
}

function App() {
	return (
		<React.Suspense fallback={<div className="container py-5">Загрузка...</div>}>
			<RouterProvider router={router} />
		</React.Suspense>
	)
}

const router = createBrowserRouter([
	{ path: '/', element: <Home /> },
	{ path: '/category/:id', element: <Category /> },
	{ path: '/login', element: <Login /> },
	{ path: '/admin', element: <PrivateRoute><Admin /></PrivateRoute> },
	{ path: '/speedtest', element: <SpeedTest /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
