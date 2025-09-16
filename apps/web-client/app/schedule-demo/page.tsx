'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Schedule {
    id: string
    name: string
    description?: string
    startTime: string
    endTime: string
    recurring: boolean
    status: 'active' | 'completed' | 'cancelled'
}

export default function ScheduleDemoPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([
        {
            id: '1',
            name: 'Daily Standup',
            description: 'Team synchronization meeting',
            startTime: '2024-01-15T09:00:00Z',
            endTime: '2024-01-15T09:30:00Z',
            recurring: true,
            status: 'active'
        },
        {
            id: '2',
            name: 'Code Review Session',
            description: 'Review pull requests and discuss architecture',
            startTime: '2024-01-15T14:00:00Z',
            endTime: '2024-01-15T15:00:00Z',
            recurring: false,
            status: 'active'
        }
    ])

    const [newSchedule, setNewSchedule] = useState({
        name: '',
        description: '',
        startTime: '',
        endTime: '',
        recurring: false
    })

    const [isCreating, setIsCreating] = useState(false)

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsCreating(true)

        // Simulate API call
        setTimeout(() => {
            const schedule: Schedule = {
                id: Date.now().toString(),
                ...newSchedule,
                status: 'active'
            }

            setSchedules(prev => [...prev, schedule])
            setNewSchedule({
                name: '',
                description: '',
                startTime: '',
                endTime: '',
                recurring: false
            })
            setIsCreating(false)
        }, 1000)
    }

    const handleDeleteSchedule = (id: string) => {
        setSchedules(prev => prev.filter(s => s.id !== id))
    }

    const formatDateTime = (isoString: string) => {
        return new Date(isoString).toLocaleString()
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backLink}>← Back to Home</Link>
                <h1>Schedule Management Demo</h1>
                <p>Interactive demonstration of schedule creation and management</p>
            </header>

            <main className={styles.main}>
                <div className={styles.createSection}>
                    <h2>Create New Schedule</h2>
                    <form onSubmit={handleCreateSchedule} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Schedule Name *</label>
                            <input
                                type="text"
                                required
                                value={newSchedule.name}
                                onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter schedule name"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Description</label>
                            <textarea
                                value={newSchedule.description}
                                onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Optional description"
                                rows={3}
                            />
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Start Time *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={newSchedule.startTime}
                                    onChange={(e) => setNewSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>End Time *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={newSchedule.endTime}
                                    onChange={(e) => setNewSchedule(prev => ({ ...prev, endTime: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={newSchedule.recurring}
                                    onChange={(e) => setNewSchedule(prev => ({ ...prev, recurring: e.target.checked }))}
                                />
                                Recurring Schedule
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isCreating}
                        >
                            {isCreating ? 'Creating...' : 'Create Schedule'}
                        </button>
                    </form>
                </div>

                <div className={styles.scheduleList}>
                    <h2>Active Schedules ({schedules.length})</h2>

                    {schedules.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No schedules created yet. Create your first schedule above!</p>
                        </div>
                    ) : (
                        <div className={styles.scheduleGrid}>
                            {schedules.map((schedule) => (
                                <div key={schedule.id} className={styles.scheduleCard}>
                                    <div className={styles.scheduleHeader}>
                                        <h3>{schedule.name}</h3>
                                        <div className={styles.scheduleActions}>
                                            <span className={`${styles.status} ${styles[schedule.status]}`}>
                                                {schedule.status}
                                            </span>
                                            <button
                                                className="btn-danger"
                                                onClick={() => handleDeleteSchedule(schedule.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    {schedule.description && (
                                        <p className={styles.scheduleDescription}>
                                            {schedule.description}
                                        </p>
                                    )}

                                    <div className={styles.scheduleDetails}>
                                        <div className={styles.timeInfo}>
                                            <strong>Start:</strong> {formatDateTime(schedule.startTime)}
                                        </div>
                                        <div className={styles.timeInfo}>
                                            <strong>End:</strong> {formatDateTime(schedule.endTime)}
                                        </div>
                                        {schedule.recurring && (
                                            <div className={styles.recurringBadge}>
                                                🔄 Recurring
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}