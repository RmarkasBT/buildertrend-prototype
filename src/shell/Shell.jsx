import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNav from './TopNav'
import Sidebar from './Sidebar'
import Modal from '../components/Modal'

// Subs/Vendors and Client Contacts are company-wide directories, not
// job-scoped — the real product renders them full-width with no job
// sidebar, unlike every other page in this app.
const NO_SIDEBAR_PATHS = ['/subs-vendors', '/client-contacts']

export default function Shell() {
  const [newJobOpen, setNewJobOpen] = useState(false)
  const { pathname } = useLocation()
  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname)

  return (
    <div className="flex h-screen flex-col">
      <TopNav onQuickAdd={() => setNewJobOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar onNewJob={() => setNewJobOpen(true)} />}
        <main className="flex-1 overflow-y-auto bg-gray-5">
          <Outlet />
        </main>
      </div>

      {newJobOpen && (
        <Modal
          title="New Job"
          onClose={() => setNewJobOpen(false)}
          footer={
            <>
              <button
                onClick={() => setNewJobOpen(false)}
                className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-70"
              >
                Cancel
              </button>
              <button
                onClick={() => setNewJobOpen(false)}
                className="rounded-sm bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white"
              >
                Create Job
              </button>
            </>
          }
        >
          <label className="mb-1 block text-xs font-medium text-gray-60">Job name</label>
          <input className="mb-3 w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm" placeholder="e.g. Maple Street Remodel" />
          <label className="mb-1 block text-xs font-medium text-gray-60">Address</label>
          <input className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm" placeholder="Street, City, State ZIP" />
        </Modal>
      )}
    </div>
  )
}
