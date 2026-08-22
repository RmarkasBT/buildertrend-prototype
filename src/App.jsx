import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { JobProvider } from './context/JobContext'
import Shell from './shell/Shell'
import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import DailyLogs from './pages/DailyLogs'
import JobCostingBudget from './pages/JobCostingBudget'
import Invoices from './pages/Invoices'
import PurchaseOrders from './pages/PurchaseOrders'
import SubsVendors from './pages/SubsVendors'
import ClientContacts from './pages/ClientContacts'
import Estimate from './pages/Estimate'
import OutOfScope from './pages/OutOfScope'

const OUT_OF_SCOPE_ROUTES = [
  ['/lead-opportunities', 'Lead Opportunities'],
  ['/lead-activities', 'Lead Activities'],
  ['/lead-proposals', 'Lead Proposals'],
  ['/lead-calendar', 'Lead Activity Calendar'],
  ['/lead-map', 'Lead Map'],
  ['/job-info', 'Job Info'],
  ['/job-price-summary', 'Job Price Summary'],
  ['/jobs-list', 'Jobs List'],
  ['/jobs-map', 'Jobs Map'],
  ['/new-job-scratch', 'New Job From Scratch'],
  ['/new-job-template', 'New Job From Template'],
  ['/documents', 'Documents'],
  ['/photos', 'Photos'],
  ['/videos', 'Videos'],
  ['/internal-users', 'Internal Users'],
  ['/tasks', 'Tasks'],
  ['/change-orders', 'Change Orders'],
  ['/selections', 'Selections'],
  ['/warranties', 'Warranties'],
  ['/time-clock', 'Time Clock'],
  ['/plans', 'Plans and Specs'],
  ['/client-updates', 'Client Updates'],
  ['/submittals', 'Submittals'],
  ['/comments', 'Comments'],
  ['/messages', 'Messages'],
  ['/rfis', 'RFIs'],
  ['/notification-history', 'Notification History'],
  ['/surveys', 'Surveys'],
  ['/chat', 'Chat'],
  ['/bids', 'Bids'],
  ['/bills', 'Bills'],
  ['/cost-inbox', 'Cost Inbox'],
  ['/accept-online-payments', 'Accept Online Payments'],
  ['/reports', 'Reports'],
]

export default function App() {
  return (
    <BrowserRouter>
      <JobProvider>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="daily-logs" element={<DailyLogs />} />
            <Route path="job-costing-budget" element={<JobCostingBudget />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="estimate" element={<Estimate />} />
            <Route path="subs-vendors" element={<SubsVendors />} />
            <Route path="client-contacts" element={<ClientContacts />} />
            {OUT_OF_SCOPE_ROUTES.map(([path, label]) => (
              <Route key={path} path={path.slice(1)} element={<OutOfScope label={label} />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </JobProvider>
    </BrowserRouter>
  )
}
