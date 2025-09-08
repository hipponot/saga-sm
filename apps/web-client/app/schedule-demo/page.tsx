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
    const [schedules, setSchedules] = useState&lt;Schedule[]&gt;([
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
            
            setSchedules(prev =&gt; [...prev, schedule])
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
        setSchedules(prev =&gt; prev.filter(s =&gt; s.id !== id))
    }

    const formatDateTime = (isoString: string) => {
        return new Date(isoString).toLocaleString()
    }

    return (
        &lt;div className={styles.container}&gt;
            &lt;header className={styles.header}&gt;
                &lt;Link href="/" className={styles.backLink}&gt;← Back to Home&lt;/Link&gt;
                &lt;h1&gt;Schedule Management Demo&lt;/h1&gt;
                &lt;p&gt;Interactive demonstration of schedule creation and management&lt;/p&gt;
            &lt;/header&gt;

            &lt;main className={styles.main}&gt;
                &lt;div className={styles.createSection}&gt;
                    &lt;h2&gt;Create New Schedule&lt;/h2&gt;
                    &lt;form onSubmit={handleCreateSchedule} className={styles.form}&gt;
                        &lt;div className={styles.formGroup}&gt;
                            &lt;label&gt;Schedule Name *&lt;/label&gt;
                            &lt;input
                                type="text"
                                required
                                value={newSchedule.name}
                                onChange={(e) =&gt; setNewSchedule(prev =&gt; ({ ...prev, name: e.target.value }))}
                                placeholder="Enter schedule name"
                            /&gt;
                        &lt;/div&gt;

                        &lt;div className={styles.formGroup}&gt;
                            &lt;label&gt;Description&lt;/label&gt;
                            &lt;textarea
                                value={newSchedule.description}
                                onChange={(e) =&gt; setNewSchedule(prev =&gt; ({ ...prev, description: e.target.value }))}
                                placeholder="Optional description"
                                rows={3}
                            /&gt;
                        &lt;/div&gt;

                        &lt;div className={styles.formRow}&gt;
                            &lt;div className={styles.formGroup}&gt;
                                &lt;label&gt;Start Time *&lt;/label&gt;
                                &lt;input
                                    type="datetime-local"
                                    required
                                    value={newSchedule.startTime}
                                    onChange={(e) =&gt; setNewSchedule(prev =&gt; ({ ...prev, startTime: e.target.value }))}
                                /&gt;
                            &lt;/div&gt;

                            &lt;div className={styles.formGroup}&gt;
                                &lt;label&gt;End Time *&lt;/label&gt;
                                &lt;input
                                    type="datetime-local"
                                    required
                                    value={newSchedule.endTime}
                                    onChange={(e) =&gt; setNewSchedule(prev =&gt; ({ ...prev, endTime: e.target.value }))}
                                /&gt;
                            &lt;/div&gt;
                        &lt;/div&gt;

                        &lt;div className={styles.formGroup}&gt;
                            &lt;label className={styles.checkboxLabel}&gt;
                                &lt;input
                                    type="checkbox"
                                    checked={newSchedule.recurring}
                                    onChange={(e) =&gt; setNewSchedule(prev =&gt; ({ ...prev, recurring: e.target.checked }))}
                                /&gt;
                                Recurring Schedule
                            &lt;/label&gt;
                        &lt;/div&gt;

                        &lt;button 
                            type="submit" 
                            className="btn-primary"
                            disabled={isCreating}
                        &gt;
                            {isCreating ? 'Creating...' : 'Create Schedule'}
                        &lt;/button&gt;
                    &lt;/form&gt;
                &lt;/div&gt;

                &lt;div className={styles.scheduleList}&gt;
                    &lt;h2&gt;Active Schedules ({schedules.length})&lt;/h2&gt;
                    
                    {schedules.length === 0 ? (
                        &lt;div className={styles.emptyState}&gt;
                            &lt;p&gt;No schedules created yet. Create your first schedule above!&lt;/p&gt;
                        &lt;/div&gt;
                    ) : (
                        &lt;div className={styles.scheduleGrid}&gt;
                            {schedules.map((schedule) =&gt; (
                                &lt;div key={schedule.id} className={styles.scheduleCard}&gt;
                                    &lt;div className={styles.scheduleHeader}&gt;
                                        &lt;h3&gt;{schedule.name}&lt;/h3&gt;
                                        &lt;div className={styles.scheduleActions}&gt;
                                            &lt;span className={`${styles.status} ${styles[schedule.status]}`}&gt;
                                                {schedule.status}
                                            &lt;/span&gt;
                                            &lt;button 
                                                className="btn-danger"
                                                onClick={() =&gt; handleDeleteSchedule(schedule.id)}
                                            &gt;
                                                Delete
                                            &lt;/button&gt;
                                        &lt;/div&gt;
                                    &lt;/div&gt;
                                    
                                    {schedule.description && (
                                        &lt;p className={styles.scheduleDescription}&gt;
                                            {schedule.description}
                                        &lt;/p&gt;
                                    )}
                                    
                                    &lt;div className={styles.scheduleDetails}&gt;
                                        &lt;div className={styles.timeInfo}&gt;
                                            &lt;strong&gt;Start:&lt;/strong&gt; {formatDateTime(schedule.startTime)}
                                        &lt;/div&gt;
                                        &lt;div className={styles.timeInfo}&gt;
                                            &lt;strong&gt;End:&lt;/strong&gt; {formatDateTime(schedule.endTime)}
                                        &lt;/div&gt;
                                        {schedule.recurring && (
                                            &lt;div className={styles.recurringBadge}&gt;
                                                🔄 Recurring
                                            &lt;/div&gt;
                                        )}
                                    &lt;/div&gt;
                                &lt;/div&gt;
                            ))}
                        &lt;/div&gt;
                    )}
                &lt;/div&gt;
            &lt;/main&gt;
        &lt;/div&gt;
    )
}