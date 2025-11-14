import React from 'react'

export default function About(){
  return (
    <div className="min-h-screen bg-background-dark font-display text-white p-6">
      <header className="py-4">
        <h1 className="text-2xl font-bold text-center">About Us</h1>
      </header>

      <main className="max-w-4xl mx-auto">
        <section className="bg-cover bg-center p-6 rounded-xl" style={{backgroundImage: 'linear-gradient(rgba(10,25,47,0.4), rgba(10,25,47,0.8))'}}>
          <h2 className="text-3xl font-black text-center">Building a Happier Tomorrow</h2>
          <p className="text-secondary-text mt-2 text-center">At Happiness, we blend technology and compassion to make emotional support accessible to everyone. Through simple, private audio sessions, we're reimagining how people find comfort, clarity, and connection.</p>
        </section>

        <section className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="glassmorphic p-6 rounded-xl">
            <h3 className="text-primary font-bold">Our Mission</h3>
            <p className="text-secondary-text mt-2">To make mental wellness simple, personal, and within reach — for everyone, everywhere.</p>
          </div>
          <div className="glassmorphic p-6 rounded-xl">
            <h3 className="text-primary font-bold">Our Vision</h3>
            <p className="text-secondary-text mt-2">A world where seeking help feels natural, immediate, and stigma-free.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
