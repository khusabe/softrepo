import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../i18n'

type Category = { id: number; name: string }
type Software = { id: number; title: string; version: string; downloadsCount: number; uploadDate: string; category: Category }

export default function Home() {
	const [categories, setCategories] = useState<Category[]>([])
	const [items, setItems] = useState<Software[]>([])
	const [q, setQ] = useState('')
	const [sort, setSort] = useState<'date'|'downloads'|'title'>('date')
	const [order, setOrder] = useState<'asc'|'desc'>('desc')
    const [avInfo, setAvInfo] = useState<{updatedAt?: string, zip?: string} | null>(null)

	useEffect(() => {
		fetch('/api/categories').then(r=>r.json()).then(setCategories)
		fetch('/api/av/latest').then(r=>r.json()).then(setAvInfo).catch(()=>{})
	}, [])

	useEffect(() => {
		const url = new URL('/api/software', location.origin)
		if (q) url.searchParams.set('q', q)
		url.searchParams.set('sort', sort)
		url.searchParams.set('order', order)
		fetch(url.toString()).then(r=>r.json()).then(d=> setItems(d.items || []))
	}, [q, sort, order])


	return (
		<div className="container py-4">
			<h1 className="mb-3">{t('title')}</h1>
			{avInfo && (
				<div className="alert alert-info d-flex justify-content-between align-items-center">
					<div>
						<strong>Антивирус база:</strong> {avInfo.updatedAt ? new Date(avInfo.updatedAt).toLocaleString() : '—'}
					</div>
					{avInfo.zip && <a className="btn btn-sm btn-primary" href={avInfo.zip}>Скачать архив</a>}
				</div>
			)}
			<div className="mb-4 d-flex flex-wrap gap-2">
				<Link to="/" className="btn btn-outline-secondary btn-sm">Главная</Link>
				<Link to="/speedtest" className="btn btn-outline-primary btn-sm">Speed Test</Link>
				<Link to="/login" className="btn btn-outline-secondary btn-sm">Войти</Link>
				<Link to="/admin" className="btn btn-outline-secondary btn-sm">Админ-панель</Link>
			</div>
			<div className="row g-3 mb-4">
				<div className="col-12 col-md-4">
					<input className="form-control" placeholder={t('search')} value={q} onChange={e=>setQ(e.target.value)} />
				</div>
				<div className="col-auto">
					<select className="form-select" value={sort} onChange={e=>setSort(e.target.value as any)}>
						<option value="date">{t('byDate')}</option>
						<option value="downloads">{t('byDownloads')}</option>
						<option value="title">{t('byTitle')}</option>
					</select>
				</div>
				<div className="col-auto">
					<select className="form-select" value={order} onChange={e=>setOrder(e.target.value as any)}>
						<option value="desc">{t('orderDesc')}</option>
						<option value="asc">{t('orderAsc')}</option>
					</select>
				</div>
			</div>


			<div className="mb-3 d-flex flex-wrap gap-2">
				{categories.map(c=> (
					<Link key={c.id} to={`/category/${c.id}`} className="btn btn-outline-secondary btn-sm">{c.name}</Link>
				))}
			</div>

			<div className="row g-3">
				{items.map(s => (
					<div key={s.id} className="col-12 col-md-6 col-lg-4">
						<div className="card h-100">
							<div className="card-body d-flex flex-column">
								<h5 className="card-title">{s.title}</h5>
								<p className="card-subtitle mb-2 text-muted">Версия: {s.version}</p>
								<p className="mb-3">Категория: {s.category?.name}</p>
								<div className="mt-auto d-flex justify-content-between">
									<a href={`/api/software/${s.id}/download`} className="btn btn-primary">Скачать</a>
									<small className="text-muted">⬇️ {s.downloadsCount}</small>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
