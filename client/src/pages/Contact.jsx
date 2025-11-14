import React from 'react'

export default function Contact(){
  return (
    <div className="min-h-screen bg-background-dark font-display text-white p-6">
      <header className="py-4">
        <h1 className="text-2xl font-bold text-center">Contact Us</h1>
      </header>
      <main className="max-w-3xl mx-auto mt-12">
        <div className="glassmorphism p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-highlight mb-2">Email</h3>
              <p className="text-secondary-text">contact@happiness.com</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-highlight mb-2">Phone</h3>
              <p className="text-secondary-text">+1 (234) 567-890</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-highlight mb-2">Hours</h3>
              <p className="text-secondary-text">Available 24/7 for support</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
