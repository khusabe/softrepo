import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

type Software = { id: number; title: string; version: string; downloadsCount: number }

export default function Category() {
	const { id } = useParams()
	const [items, setItems] = useState<Software[]>([])

	useEffect(() => {
		const url = new URL('/api/software', location.origin)
		url.searchParams.set('categoryId', String(id))
		fetch(url.toString()).then(r=>r.json()).then(d=> setItems(d.items || []))
	}, [id])

	return (
		<div className="container py-4">
			<h1 className="mb-4">Категория #{id}</h1>
			<div className="row g-3">
				{items.map(s => (
					<div key={s.id} className="col-12 col-md-6 col-lg-4">
						<div className="card h-100">
							<div className="card-body d-flex flex-column">
								<h5 className="card-title">{s.title}</h5>
								<p className="card-subtitle mb-2 text-muted">Версия: {s.version}</p>
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
