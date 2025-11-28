'use client'

import { useState, useEffect } from 'react'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'unhealthy' | 'loading'
  url: string
}

export default function Home() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Gateway', status: 'loading', url: '/api/health' },
    { name: 'Query Engine', status: 'loading', url: '' },
    { name: 'Storage', status: 'loading', url: '' },
    { name: 'Auth Service', status: 'loading', url: '' },
  ])

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          🧱 OpenBricks Studio
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Open-source data platform dashboard
        </p>
      </header>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          📊 Platform Overview
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem' 
        }}>
          <ServiceCard 
            title="Query Engine"
            description="Apache Spark SQL queries"
            icon="⚡"
            href="http://localhost:4040"
          />
          <ServiceCard 
            title="Workspace"
            description="JupyterLab notebooks"
            icon="📓"
            href="http://localhost:8888"
          />
          <ServiceCard 
            title="Storage"
            description="MinIO object storage"
            icon="💾"
            href="http://localhost:9001"
          />
          <ServiceCard 
            title="API Gateway"
            description="REST/GraphQL endpoints"
            icon="🔌"
            href="http://localhost:8080/api"
          />
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          🚀 Quick Actions
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <ActionButton href="http://localhost:8888" label="Open Notebook" />
          <ActionButton href="http://localhost:9001" label="Manage Storage" />
          <ActionButton href="http://localhost:4040" label="View Spark UI" />
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          📖 Getting Started
        </h2>
        
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1.5rem', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: '2' }}>
            <li>Access the <strong>Workspace</strong> to create interactive notebooks</li>
            <li>Use <strong>Spark SQL</strong> to query your Delta Lake tables</li>
            <li>Manage files in <strong>Storage</strong> using the MinIO console</li>
            <li>Monitor queries in the <strong>Spark UI</strong></li>
          </ol>
        </div>
      </section>

      <footer style={{ 
        marginTop: '4rem', 
        paddingTop: '2rem', 
        borderTop: '1px solid #e9ecef',
        textAlign: 'center',
        color: '#666'
      }}>
        <p>OpenBricks v0.1.0 - Open-source data platform</p>
      </footer>
    </main>
  )
}

function ServiceCard({ title, description, icon, href }: { 
  title: string
  description: string
  icon: string
  href: string
}) {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>{description}</p>
    </a>
  )
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-block',
        padding: '0.75rem 1.5rem',
        background: '#0066ff',
        color: 'white',
        borderRadius: '6px',
        fontWeight: '500',
        transition: 'background 0.2s'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = '#0052cc'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = '#0066ff'
      }}
    >
      {label}
    </a>
  )
}
