import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { t } from '../i18n'

type Category = { id: number; name: string }
 type Software = { id: number; title: string; version: string; downloadsCount: number, categoryId: number }

export default function Admin() {
	const [categories, setCategories] = useState<Category[]>([])
	const [software, setSoftware] = useState<Software[]>([])
	const [name, setName] = useState('')
	const [desc, setDesc] = useState('')
	const [title, setTitle] = useState('')
	const [version, setVersion] = useState('')
	const [swDesc, setSwDesc] = useState('')
	const [catId, setCatId] = useState<number | ''>('' as any)
	const [file, setFile] = useState<File | null>(null)
	const [error, setError] = useState('')
	const [okMsg, setOkMsg] = useState('')
	const [isUploading, setIsUploading] = useState(false)
	const [uploaded, setUploaded] = useState(0)
	const [total, setTotal] = useState(0)
	const [speedBps, setSpeedBps] = useState(0)
	const [etaSec, setEtaSec] = useState<number | null>(null)

	const percent = useMemo(() => {
		if (!total) return 0
		return Math.max(0, Math.min(100, Math.floor((uploaded / total) * 100)))
	}, [uploaded, total])

	function humanBytes(n: number) {
		const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
		let i = 0; let v = n
		while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
		return `${v.toFixed(1)} ${units[i]}`
	}

	useEffect(() => {
		const t = localStorage.getItem('token')
		if (!t) { location.href = '/login'; return }
		refresh().catch(handleError)
	}, [])

	async function refresh() {
		const cats = await fetch('/api/categories').then(r=>r.json())
		setCategories(cats)
		const sw = await fetch('/api/software').then(r=>r.json())
		setSoftware(sw.items || [])
	}

	function handleError(e: any) {
		if (e && e.status === 401) {
			setError('401: Unauthorized')
			setTimeout(()=> location.href = '/login', 800)
			return
		}
		setError(String(e?.message || e))
	}

	async function addCategory(e: React.FormEvent) {
		e.preventDefault(); setError(''); setOkMsg('')
		try {
			await apiFetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: desc }) })
			setName(''); setDesc(''); setOkMsg(t('addCategorySuccess')); await refresh()
		} catch (e) { handleError(e) }
	}

	async function deleteCategory(id: number) {
		if (!confirm(t('deleteCategoryConfirm'))) return
		try {
			await apiFetch(`/api/categories/${id}`, { method: 'DELETE' })
			setOkMsg(t('deleteCategorySuccess')); await refresh()
		} catch (e) { handleError(e) }
	}

	async function uploadSoftware(e: React.FormEvent) {
		e.preventDefault(); setError(''); setOkMsg('')
		try {
			if (!file || !catId) return setError(t('uploadNeedSelect'))
			const fd = new FormData()
			fd.append('title', title)
			fd.append('version', version)
			fd.append('description', swDesc)
			fd.append('categoryId', String(catId))
			fd.append('file', file)

			const token = localStorage.getItem('token')
			setIsUploading(true); setUploaded(0); setTotal(0); setSpeedBps(0); setEtaSec(null)
			const startTs = Date.now()
			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest()
				xhr.open('POST', '/api/software')
				if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
				xhr.upload.onprogress = (ev) => {
					if (ev.lengthComputable) {
						setUploaded(ev.loaded)
						setTotal(ev.total)
						const dt = (Date.now() - startTs) / 1000
						if (dt > 0) {
							const bps = ev.loaded / dt
							setSpeedBps(bps)
							if (ev.loaded < ev.total) setEtaSec(Math.max(1, Math.round((ev.total - ev.loaded) / bps)))
						}
					}
				}
				xhr.onerror = () => reject(new Error('Ошибка сети при загрузке'))
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`Ошибка ${xhr.status}`))
				}
				xhr.send(fd)
			})
			setOkMsg(t('fileUploadedSuccess'))
			setTitle(''); setVersion(''); setSwDesc(''); setCatId('' as any); setFile(null)
			await refresh()
		} catch (e) { handleError(e) } finally { setIsUploading(false) }
	}

	async function deleteSoftwareItem(id: number) {
		if (!confirm(t('deleteFileConfirm'))) return
		try {
			await apiFetch(`/api/software/${id}`, { method: 'DELETE' })
			setOkMsg(t('deleteFileSuccess')); await refresh()
		} catch (e) { handleError(e) }
	}

	function logout() {
		localStorage.removeItem('token')
		location.href = '/login'
	}

	return (
		<div className="container py-4">
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h1 className="m-0">{t('adminTitle')}</h1>
				<button className="btn btn-outline-secondary btn-sm" onClick={logout}>{t('signOut')}</button>
			</div>
			{error && <div className="alert alert-danger py-2">{error}</div>}
			{okMsg && <div className="alert alert-success py-2">{okMsg}</div>}

			<h4 className="mt-4">{t('categoriesTitle')}</h4>
			<form onSubmit={addCategory} className="row g-2 mb-3">
				<div className="col-md-3"><input className="form-control" placeholder={t('name')} value={name} onChange={e=>setName(e.target.value)} /></div>
				<div className="col-md-5"><input className="form-control" placeholder={t('description')} value={desc} onChange={e=>setDesc(e.target.value)} /></div>
				<div className="col-md-2"><button className="btn btn-primary w-100" type="submit">{t('add')}</button></div>
			</form>
			<ul className="list-group mb-4">
				{categories.map(c => (
					<li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
						<div>{c.name} <span className="badge bg-secondary">#{c.id}</span></div>
						<button className="btn btn-sm btn-outline-danger" onClick={()=>deleteCategory(c.id)}>Удалить</button>
					</li>
				))}
			</ul>

			<h4 className="mt-4">Загрузка ПО</h4>
			<form onSubmit={uploadSoftware} className="row g-2 mb-3">
				<div className="col-md-3"><input className="form-control" placeholder="Название" value={title} onChange={e=>setTitle(e.target.value)} /></div>
				<div className="col-md-2"><input className="form-control" placeholder="Версия" value={version} onChange={e=>setVersion(e.target.value)} /></div>
				<div className="col-md-3"><input className="form-control" placeholder="Описание" value={swDesc} onChange={e=>setSwDesc(e.target.value)} /></div>
				<div className="col-md-2">
					<select className="form-select" value={catId} onChange={e=>setCatId(Number(e.target.value))}>
						<option value="">Категория</option>
						{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
					</select>
				</div>
				<div className="col-md-2"><input className="form-control" type="file" onChange={e=>setFile(e.target.files?.[0] || null)} /></div>
				<div className="col-12 d-flex align-items-center gap-3">
					<button className="btn btn-success" type="submit" disabled={isUploading}>Загрузить</button>
					{isUploading && (
						<div className="flex-grow-1">
							<div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
								<div className="progress-bar" style={{width: `${percent}%`}}>{percent}%</div>
							</div>
							<div className="small text-muted mt-1">
								{humanBytes(uploaded)} / {total ? humanBytes(total) : '?'} · скорость {humanBytes(speedBps)}/с {etaSec ? `· ≈${etaSec} c` : ''}
							</div>
						</div>
					)}
				</div>
			</form>

			<h4 className="mt-4">{t('files')}</h4>
			<div className="table-responsive">
				<table className="table table-sm align-middle">
					<thead>
						<tr><th>{t('id')}</th><th>{t('name')}</th><th>{t('versionCol')}</th><th>{t('categoryCol')}</th><th>{t('downloadsCol')}</th><th></th></tr>
					</thead>
					<tbody>
						{software.map(s => (
							<tr key={s.id}>
								<td>{s.id}</td>
								<td>{s.title}</td>
								<td>{s.version}</td>
								<td>{s.categoryId}</td>
								<td>{s.downloadsCount}</td>
								<td className="text-end">
									<a className="btn btn-sm btn-outline-primary me-2" href={`/api/software/${s.id}/download`}>{t('download')}</a>
									<button className="btn btn-sm btn-outline-danger" onClick={()=>deleteSoftwareItem(s.id)}>{t('delete')}</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
