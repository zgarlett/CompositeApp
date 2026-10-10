import { useCallback, useEffect, useState, type FormEvent } from 'react'
import './SearchPage.css'

type BillingAccount = {
	accountId: number
	accountNumber: string
	accountName: string
	billingContact: string
	billingEmail: string
	billingPhone: string
	billingAddress: string
	paymentTerms: string
	status: 'Active' | 'Pending' | 'On hold' | 'Closed'
}

type ApiError = { error?: string }

async function readError(response: Response) {
	const payload = (await response.json().catch(() => ({}))) as ApiError
	return payload.error ?? `Request failed (${response.status})`
}

function SearchPage() {
	const [query, setQuery] = useState('')
	const [accounts, setAccounts] = useState<BillingAccount[]>([])
	const [selectedAccount, setSelectedAccount] = useState<BillingAccount | null>(null)
	const [draft, setDraft] = useState<BillingAccount | null>(null)
	const [isSearching, setIsSearching] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState('')

	const hasChanges =
		selectedAccount !== null &&
		draft !== null &&
		JSON.stringify(selectedAccount) !== JSON.stringify(draft)

	const searchAccounts = useCallback(async (searchTerm: string) => {
		setIsSearching(true)
		setError('')

		try {
			const response = await fetch(
				`/api/billing-accounts?search=${encodeURIComponent(searchTerm)}`,
			)
			if (!response.ok) throw new Error(await readError(response))

			const foundAccounts = (await response.json()) as BillingAccount[]
			setAccounts(foundAccounts)
			setSelectedAccount(foundAccounts[0] ?? null)
			setDraft(foundAccounts[0] ? { ...foundAccounts[0] } : null)
		} catch (requestError) {
			setAccounts([])
			setSelectedAccount(null)
			setDraft(null)
			setError(
				requestError instanceof Error
					? requestError.message
					: 'Unable to load billing accounts.',
			)
		} finally {
			setIsSearching(false)
		}
	}, [])

	useEffect(() => {
		void searchAccounts('')
	}, [searchAccounts])

	function handleSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (hasChanges && !window.confirm('Discard your unsaved changes?')) return
		void searchAccounts(query.trim())
	}

	function selectAccount(account: BillingAccount) {
		if (hasChanges && !window.confirm('Discard your unsaved changes?')) return
		setSelectedAccount(account)
		setDraft({ ...account })
		setError('')
	}

	function updateDraft(field: keyof BillingAccount, value: string) {
		setDraft((current) =>
			current ? ({ ...current, [field]: value } as BillingAccount) : current,
		)
	}

	async function saveAccount() {
		if (!draft) return

		setIsSaving(true)
		setError('')
		try {
			const response = await fetch(`/api/billing-accounts/${draft.accountId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(draft),
			})
			if (!response.ok) throw new Error(await readError(response))

			const savedAccount = (await response.json()) as BillingAccount
			setAccounts((current) =>
				current.map((account) =>
					account.accountId === savedAccount.accountId ? savedAccount : account,
				),
			)
			setSelectedAccount(savedAccount)
			setDraft({ ...savedAccount })
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: 'Unable to save billing account.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	function cancelChanges() {
		if (selectedAccount) setDraft({ ...selectedAccount })
		setError('')
	}

	return (
		<div className="workspace">
			<header className="topbar">
				<a className="brand" href="/" aria-label="Northstar billing home">
					<span className="brand-mark" aria-hidden="true">N</span>
					<span>Northstar<span className="brand-subtitle"> / BILLING</span></span>
				</a>
				<span className="topbar-label">ACCOUNT OPERATIONS</span>
			</header>

			<main className="workspace-main">
				<div className="page-heading">
					<div>
						<p className="eyebrow">CUSTOMER RECORDS</p>
						<h1>Billing accounts</h1>
					</div>
					<span className="record-count">{accounts.length} records</span>
				</div>

				<div className="workspace-grid">
					<section className="search-panel" aria-labelledby="search-heading">
						<div className="panel-heading">
							<div>
								<p className="eyebrow">DIRECTORY</p>
								<h2 id="search-heading">Find an account</h2>
							</div>
						</div>

						<form className="search-form" onSubmit={handleSearch}>
							<label className="sr-only" htmlFor="account-search">
								Search billing accounts
							</label>
							<input
								id="account-search"
								type="search"
								placeholder="Name, number, contact..."
								value={query}
								onChange={(event) => setQuery(event.target.value)}
							/>
							<button className="search-button" type="submit" disabled={isSearching}>
								{isSearching ? 'Searching' : 'Search'}
							</button>
						</form>

						<div className="result-summary" aria-live="polite">
							<span>{isSearching ? 'Searching accounts' : 'SEARCH RESULTS'}</span>
							{!isSearching && <span>{accounts.length}</span>}
						</div>

						<div className="result-list">
							{isSearching ? (
								<p className="list-message">Loading accounts...</p>
							) : error && accounts.length === 0 ? (
								<p className="list-message">Accounts could not be loaded.</p>
							) : accounts.length === 0 ? (
								<p className="list-message">No billing accounts match this search.</p>
							) : (
								accounts.map((account) => (
									<button
										className={`result-row${selectedAccount?.accountId === account.accountId ? ' is-selected' : ''}`}
										type="button"
										key={account.accountId}
										onClick={() => selectAccount(account)}
										aria-current={selectedAccount?.accountId === account.accountId}
									>
										<span className="result-copy">
											<span className="result-name">{account.accountName}</span>
											<span className="result-meta">{account.accountNumber} · {account.billingContact}</span>
										</span>
										<span className={`status-dot status-${account.status.toLowerCase().replace(' ', '-')}`}>
											{account.status}
										</span>
									</button>
								))
							)}
						</div>
					</section>

					<section className="detail-panel" aria-labelledby="detail-heading">
						{draft ? (
							<>
								<div className="detail-header">
									<div>
										<p className="eyebrow">ACCOUNT PROFILE</p>
										<h2 id="detail-heading">{draft.accountName}</h2>
										<p className="detail-number">Account {draft.accountNumber}</p>
									</div>
									<span className={`status-pill status-${draft.status.toLowerCase().replace(' ', '-')}`}>
										{draft.status}
									</span>
								</div>

								{error && <p className="form-error" role="alert">{error}</p>}

								<div className="field-grid">
									<label className="field">
										<span>Account name</span>
										<input value={draft.accountName} onChange={(event) => updateDraft('accountName', event.target.value)} />
									</label>
									<label className="field">
										<span>Account number</span>
										<input value={draft.accountNumber} onChange={(event) => updateDraft('accountNumber', event.target.value)} />
									</label>
									<label className="field">
										<span>Billing contact</span>
										<input value={draft.billingContact} onChange={(event) => updateDraft('billingContact', event.target.value)} />
									</label>
									<label className="field">
										<span>Email address</span>
										<input type="email" value={draft.billingEmail} onChange={(event) => updateDraft('billingEmail', event.target.value)} />
									</label>
									<label className="field">
										<span>Phone</span>
										<input type="tel" value={draft.billingPhone} onChange={(event) => updateDraft('billingPhone', event.target.value)} />
									</label>
									<label className="field">
										<span>Payment terms</span>
										<input value={draft.paymentTerms} onChange={(event) => updateDraft('paymentTerms', event.target.value)} />
									</label>
									<label className="field field-wide">
										<span>Billing address</span>
										<textarea rows={3} value={draft.billingAddress} onChange={(event) => updateDraft('billingAddress', event.target.value)} />
									</label>
									<label className="field">
										<span>Account status</span>
										<select value={draft.status} onChange={(event) => updateDraft('status', event.target.value)}>
											<option>Active</option>
											<option>Pending</option>
											<option>On hold</option>
											<option>Closed</option>
										</select>
									</label>
								</div>

								<div className="detail-footer">
									<span className="save-hint" aria-live="polite">
										{hasChanges ? 'Unsaved changes' : 'All changes saved'}
									</span>
									<div className="form-actions">
										<button className="cancel-button" type="button" onClick={cancelChanges} disabled={!hasChanges || isSaving}>
											Cancel
										</button>
										<button className="save-button" type="button" onClick={saveAccount} disabled={!hasChanges || isSaving}>
											{isSaving ? 'Saving...' : 'Save changes'}
										</button>
									</div>
								</div>
							</>
						) : (
							<div className="detail-empty">
								<span className="empty-mark" aria-hidden="true">+</span>
								<h2 id="detail-heading">Select an account</h2>
								<p>Choose a billing account from the results to view its details.</p>
								{error && <p className="form-error" role="alert">{error}</p>}
							</div>
						)}
					</section>
				</div>
			</main>
			<footer className="workspace-footer"><span>Northstar Billing</span><span>ACCOUNT MANAGEMENT</span></footer>
		</div>
	)
}

export default SearchPage;