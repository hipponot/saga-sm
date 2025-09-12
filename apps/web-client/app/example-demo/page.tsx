'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Example {
    id: string
    title: string
    description?: string
    status: 'draft' | 'published' | 'archived'
    priority: 'low' | 'medium' | 'high'
    tags: string[]
    metadata?: Record<string, any>
    createdAt: string
    updatedAt: string
}

export default function ExampleDemoPage() {
    const [examples, setExamples] = useState<Example[]>([
        {
            id: '1',
            title: 'Getting Started Guide',
            description: 'Comprehensive guide for new users',
            status: 'published',
            priority: 'high',
            tags: ['documentation', 'tutorial'],
            metadata: { author: 'John Doe', category: 'guide' },
            createdAt: '2024-01-15T09:00:00Z',
            updatedAt: '2024-01-15T09:00:00Z',
        },
        {
            id: '2',
            title: 'API Integration Tutorial',
            description: 'Learn how to integrate with external APIs',
            status: 'draft',
            priority: 'medium',
            tags: ['api', 'integration', 'tutorial'],
            metadata: { author: 'Jane Smith', category: 'technical' },
            createdAt: '2024-01-14T14:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
        },
    ])

    const [newExample, setNewExample] = useState({
        title: '',
        description: '',
        status: 'draft' as 'draft' | 'published' | 'archived',
        priority: 'medium' as 'low' | 'medium' | 'high',
        tags: [] as string[],
        tagInput: '',
    })

    const [isCreating, setIsCreating] = useState(false)

    const handleCreateExample = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsCreating(true)

        // Simulate API call
        setTimeout(() => {
            const example: Example = {
                id: Date.now().toString(),
                title: newExample.title,
                description: newExample.description,
                status: newExample.status,
                priority: newExample.priority,
                tags: newExample.tags,
                metadata: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }

            setExamples(prev => [...prev, example])
            setNewExample({
                title: '',
                description: '',
                status: 'draft',
                priority: 'medium',
                tags: [],
                tagInput: '',
            })
            setIsCreating(false)
        }, 1000)
    }

    const handleDeleteExample = (id: string) => {
        setExamples(prev => prev.filter(e => e.id !== id))
    }

    const handleAddTag = () => {
        if (newExample.tagInput.trim()) {
            setNewExample(prev => ({
                ...prev,
                tags: [...prev.tags, prev.tagInput.trim()],
                tagInput: '',
            }))
        }
    }

    const handleRemoveTag = (tagToRemove: string) => {
        setNewExample(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove),
        }))
    }

    const formatDateTime = (isoString: string) => {
        return new Date(isoString).toLocaleString()
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backLink}>
                    ← Back to Home
                </Link>
                <h1>Example Management Demo</h1>
                <p>Interactive demonstration of example creation and management</p>
            </header>

            <main className={styles.main}>
                <div className={styles.createSection}>
                    <h2>Create New Example</h2>
                    <form onSubmit={handleCreateExample} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Title *</label>
                            <input
                                type="text"
                                required
                                value={newExample.title}
                                onChange={e =>
                                    setNewExample(prev => ({ ...prev, title: e.target.value }))
                                }
                                placeholder="Enter example title"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Description</label>
                            <textarea
                                value={newExample.description}
                                onChange={e =>
                                    setNewExample(prev => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                placeholder="Optional description"
                                rows={3}
                            />
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Status</label>
                                <select
                                    value={newExample.status}
                                    onChange={e =>
                                        setNewExample(prev => ({
                                            ...prev,
                                            status: e.target.value as
                                                | 'draft'
                                                | 'published'
                                                | 'archived',
                                        }))
                                    }
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Priority</label>
                                <select
                                    value={newExample.priority}
                                    onChange={e =>
                                        setNewExample(prev => ({
                                            ...prev,
                                            priority: e.target.value as 'low' | 'medium' | 'high',
                                        }))
                                    }
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Tags</label>
                            <div className={styles.tagInput}>
                                <input
                                    type="text"
                                    value={newExample.tagInput}
                                    onChange={e =>
                                        setNewExample(prev => ({
                                            ...prev,
                                            tagInput: e.target.value,
                                        }))
                                    }
                                    onKeyPress={e =>
                                        e.key === 'Enter' && (e.preventDefault(), handleAddTag())
                                    }
                                    placeholder="Add a tag and press Enter"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    className="btn-secondary"
                                >
                                    Add Tag
                                </button>
                            </div>
                            {newExample.tags.length > 0 && (
                                <div className={styles.tags}>
                                    {newExample.tags.map(tag => (
                                        <span key={tag} className={styles.tag}>
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn-primary" disabled={isCreating}>
                            {isCreating ? 'Creating...' : 'Create Example'}
                        </button>
                    </form>
                </div>

                <div className={styles.exampleList}>
                    <h2>Examples ({examples.length})</h2>

                    {examples.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No examples created yet. Create your first example above!</p>
                        </div>
                    ) : (
                        <div className={styles.exampleGrid}>
                            {examples.map(example => (
                                <div key={example.id} className={styles.exampleCard}>
                                    <div className={styles.exampleHeader}>
                                        <h3>{example.title}</h3>
                                        <div className={styles.exampleActions}>
                                            <span
                                                className={`${styles.status} ${styles[example.status]}`}
                                            >
                                                {example.status}
                                            </span>
                                            <span
                                                className={`${styles.priority} ${styles[example.priority]}`}
                                            >
                                                {example.priority}
                                            </span>
                                            <button
                                                className="btn-danger"
                                                onClick={() => handleDeleteExample(example.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    {example.description && (
                                        <p className={styles.exampleDescription}>
                                            {example.description}
                                        </p>
                                    )}

                                    <div className={styles.exampleDetails}>
                                        {example.tags.length > 0 && (
                                            <div className={styles.tags}>
                                                {example.tags.map(tag => (
                                                    <span key={tag} className={styles.tag}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className={styles.timeInfo}>
                                            <strong>Created:</strong>{' '}
                                            {formatDateTime(example.createdAt)}
                                        </div>
                                        <div className={styles.timeInfo}>
                                            <strong>Updated:</strong>{' '}
                                            {formatDateTime(example.updatedAt)}
                                        </div>
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
