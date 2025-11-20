import React from 'react'

export default function Home(){
  return (
    <div className="bg-background-dark font-display text-white">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <main className="flex-grow">
          <div className="@container">
            <div className="@[480px]:p-4">
              <div className="flex min-h-[calc(100vh-120px)] flex-col gap-6 bg-cover bg-center bg-no-repeat items-center justify-center p-4 text-center" style={{backgroundImage: 'radial-gradient(circle at top right, rgba(100, 255, 218, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(74, 144, 226, 0.15), transparent 50%)'}}>
                <div className="flex flex-col gap-6 max-w-3xl mx-auto">
                  <h1 className="text-white text-4xl md:text-6xl font-black leading-tight tracking-[-0.033em]">
                    Your Journey to Mental Wellness Starts Here
                  </h1>
                  <h2 className="text-secondary-text text-lg md:text-xl font-normal leading-relaxed">
                    Connect with caring professionals in safe, private audio sessions. Real conversations, real support — whenever you need it most.
                  </h2>
                  <div className="flex flex-wrap gap-4 justify-center pt-4">
                    <a className="flex min-w-[160px] items-center justify-center gap-2 overflow-hidden rounded-lg h-14 px-8 bg-primary text-white text-lg font-bold tracking-[0.015em] transition-all hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(74,144,226,0.3)]" href="/services">
                      <span className="material-symbols-outlined">psychology</span>
                      Book Now (No Login)
                    </a>
                    <a className="flex min-w-[160px] items-center justify-center gap-2 overflow-hidden rounded-lg h-14 px-8 bg-transparent text-white text-lg font-bold tracking-[0.015em] border-2 border-primary/50 transition-all hover:border-highlight hover:bg-highlight/10" href="/services">
                      <span className="material-symbols-outlined">info</span>
                      Learn More
                    </a>
                  </div>
                  <div className="flex items-center justify-center gap-8 pt-8">
                    <div className="flex flex-col items-center">
                      <span className="text-highlight text-3xl font-bold">24/7</span>
                      <span className="text-secondary-text">Support Available</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-highlight text-3xl font-bold">100%</span>
                      <span className="text-secondary-text">Confidential</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-3 pt-12">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] text-center">How We Can Help You</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 max-w-6xl mx-auto">
            <div className="flex flex-1 gap-4 rounded-lg p-6 flex-col glassmorphism transition-all hover:transform hover:-translate-y-1 hover:shadow-2xl hover:border-highlight/50">
              <div className="text-highlight"><span className="material-symbols-outlined text-3xl">self_improvement</span></div>
              <div className="flex flex-col gap-1">
                <h2 className="text-white text-lg font-bold leading-tight">Personal Growth</h2>
                <p className="text-secondary-text text-sm font-normal leading-normal">Work with expert therapists to develop coping strategies and achieve personal growth.</p>
              </div>
            </div>
            <div className="flex flex-1 gap-4 rounded-lg p-6 flex-col glassmorphism transition-all hover:transform hover:-translate-y-1 hover:shadow-2xl hover:border-highlight/50">
              <div className="text-highlight"><span className="material-symbols-outlined text-3xl">headphones</span></div>
              <div className="flex flex-col gap-1">
                <h2 className="text-white text-lg font-bold leading-tight">Audio-Only Sessions</h2>
                <p className="text-secondary-text text-sm font-normal leading-normal">Comfortable, private therapy sessions without video - just your voice and your therapist's guidance.</p>
              </div>
            </div>
            <div className="flex flex-1 gap-4 rounded-lg p-6 flex-col glassmorphism transition-all hover:transform hover:-translate-y-1 hover:shadow-2xl hover:border-highlight/50">
              <div className="text-highlight"><span className="material-symbols-outlined text-3xl">schedule</span></div>
              <div className="flex flex-col gap-1">
                <h2 className="text-white text-lg font-bold leading-tight">Flexible Scheduling</h2>
                <p className="text-secondary-text text-sm font-normal leading-normal">Book sessions that fit your schedule, with 24/7 availability and easy rescheduling.</p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-3 pt-12">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] text-center">What Our Clients Say</h2>
          </div>

        </main>

        <footer className="bg-[#081424] mt-16 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-white text-lg">Happiness</h3>
              <p className="text-secondary-text text-sm">Happiness — Your pocket companion for peace of mind. Trusted support, anytime you need it.</p>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-white text-lg">Quick Links</h3>
              <a className="text-secondary-text hover:text-highlight text-sm transition-colors" href="#">About Us</a>
              <a className="text-secondary-text hover:text-highlight text-sm transition-colors" href="#">Services</a>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-white text-lg">Contact Us</h3>
              <p className="text-secondary-text text-sm">contact@happiness.com</p>
              <p className="text-secondary-text text-sm">+1 (234) 567-890</p>
            </div>
          </div>
          <div className="border-t border-primary/20 mt-8 pt-6 text-center text-sm text-secondary-text/70">
            <p>© 2025 Happiness. All Rights Reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
