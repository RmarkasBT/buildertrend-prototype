import { createContext, useContext, useState } from 'react'
import { jobs, defaultJobId } from '../data/jobs'

const JobContext = createContext(null)

export function JobProvider({ children }) {
  const [currentJobId, setCurrentJobId] = useState(defaultJobId)
  const currentJob = jobs.find((j) => j.id === currentJobId) ?? null

  return (
    <JobContext.Provider value={{ jobs, currentJobId, setCurrentJobId, currentJob }}>
      {children}
    </JobContext.Provider>
  )
}

export function useJob() {
  const ctx = useContext(JobContext)
  if (!ctx) throw new Error('useJob must be used within JobProvider')
  return ctx
}
