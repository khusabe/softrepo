import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate, Link } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { getLocale, setLocale, t } from './i18n'

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

function Shell({ children }: { children: React.ReactNode }) {
	const loc = getLocale()
	return (
		<div>
			<nav className="navbar navbar-light bg-light">
				<div className="container">
					<Link className="navbar-brand" to="/">{t('title')}</Link>
					<div className="d-flex align-items-center gap-2">
						<Link to="/speedtest" className="btn btn-sm btn-outline-primary">{t('speedTest')}</Link>
						<Link to="/login" className="btn btn-sm btn-outline-secondary">{t('login')}</Link>
						<Link to="/admin" className="btn btn-sm btn-outline-secondary">{t('admin')}</Link>
						<div className="dropdown">
							<button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">{loc.toUpperCase()}</button>
							<ul className="dropdown-menu dropdown-menu-end">
								<li><button className="dropdown-item" onClick={()=>setLocale('ru')}>RU</button></li>
								<li><button className="dropdown-item" onClick={()=>setLocale('uz')}>UZ</button></li>
							</ul>
						</div>
					</div>
				</div>
			</nav>
			{children}
		</div>
	)
}

function App() {
	return (
		<React.Suspense fallback={<div className="container py-5">Загрузка...</div>}>
			<RouterProvider router={router} />
		</React.Suspense>
	)
}

const router = createBrowserRouter([
	{ path: '/', element: <Shell><Home /></Shell> },
	{ path: '/category/:id', element: <Shell><Category /></Shell> },
	{ path: '/login', element: <Shell><Login /></Shell> },
	{ path: '/admin', element: <Shell><PrivateRoute><Admin /></PrivateRoute></Shell> },
	{ path: '/speedtest', element: <Shell><SpeedTest /></Shell> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
