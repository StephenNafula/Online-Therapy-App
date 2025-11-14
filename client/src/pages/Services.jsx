import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Services(){
  const navigate = useNavigate()

  const therapyServices = [
    {
      category: "🧍‍♂️ Individual Therapy",
      services: [
        {
          name: "30-Minute Check-In Session",
          description: "A short, focused session for quick emotional check-ins, progress updates, or follow-ups.",
          price: 40,
          duration: 30,
          icon: "schedule"
        },
        {
          name: "60-Minute Individual Therapy",
          description: "A standard full session for personal counseling on anxiety, stress, self-esteem, or life transitions.",
          price: 70,
          duration: 60,
          icon: "psychology"
        },
        {
          name: "90-Minute Deep-Dive Session",
          description: "Extended therapy for complex issues or intensive emotional work.",
          price: 100,
          duration: 90,
          icon: "explore"
        }
      ]
    },
    {
      category: "💑 Couples Therapy",
      services: [
        {
          name: "Standard Couples Session",
          description: "Helps partners communicate better, resolve conflicts, and strengthen their relationship.",
          price: 100,
          duration: 60,
          icon: "favorite"
        },
        {
          name: "Extended Couples Session",
          description: "Ideal for couples working through major issues, separation concerns, or pre-marital counseling.",
          price: 130,
          duration: 90,
          icon: "handshake"
        },
        {
          name: "Pre-Marital Counseling Package",
          description: "A 4-session package focused on relationship expectations, finances, and emotional compatibility.",
          price: 350,
          duration: 240,
          isPackage: true,
          packageInfo: "4 sessions",
          icon: "event_note"
        }
      ]
    },
    {
      category: "👨‍👩‍👧 Family Therapy",
      services: [
        {
          name: "Family Therapy Session",
          description: "Work on family communication, parenting challenges, or conflict resolution.",
          price: 120,
          duration: 60,
          icon: "group"
        },
        {
          name: "Teen & Adolescent Therapy",
          description: "Focused support for teenagers facing emotional, academic, or social stress.",
          price: 60,
          duration: 45,
          icon: "school"
        },
        {
          name: "Parent Coaching Session",
          description: "Guidance for parents dealing with behavioral or emotional issues in children.",
          price: 70,
          duration: 60,
          icon: "support_agent"
        }
      ]
    },
    {
      category: "🌈 Specialized Therapy",
      services: [
        {
          name: "Trauma Recovery Therapy",
          description: "Safe space for trauma healing using CBT, EMDR, or somatic techniques.",
          price: 90,
          duration: 60,
          icon: "healing"
        },
        {
          name: "Anxiety & Stress Management",
          description: "Techniques to manage anxiety, panic attacks, and chronic stress.",
          price: 65,
          duration: 45,
          icon: "psychology"
        },
        {
          name: "Depression Support Session",
          description: "Helps individuals cope with depression through structured therapeutic approaches.",
          price: 70,
          duration: 60,
          icon: "sentiment_very_satisfied"
        },
        {
          name: "Grief & Loss Counseling",
          description: "Emotional support and healing strategies after loss or major life changes.",
          price: 75,
          duration: 60,
          icon: "favorite_border"
        },
        {
          name: "Addiction Recovery Therapy",
          description: "Personalized therapy to support recovery from substance use or behavioral addictions.",
          price: 85,
          duration: 60,
          icon: "health_and_safety"
        }
      ]
    },
    {
      category: "💼 Workplace & Coaching",
      services: [
        {
          name: "Career & Life Coaching",
          description: "Focused on personal growth, burnout prevention, and goal alignment.",
          price: 70,
          duration: 45,
          icon: "trending_up"
        },
        {
          name: "Employee Wellness Session",
          description: "For organizations offering therapy benefits or wellness programs to staff.",
          price: 300,
          duration: 300,
          isPackage: true,
          packageInfo: "Corporate package (5 sessions)",
          icon: "business"
        }
      ]
    },
    {
      category: "🧘 Mindfulness & Wellness",
      services: [
        {
          name: "Mindfulness Coaching",
          description: "Learn meditation, relaxation, and breathing techniques to reduce stress.",
          price: 60,
          duration: 45,
          icon: "spa"
        },
        {
          name: "Group Therapy Session",
          description: "Join a supportive group to share experiences and learn coping strategies.",
          price: 40,
          duration: 60,
          icon: "people"
        }
      ]
    }
  ]

  const handleBookSession = (service) => {
    navigate('/booking', { state: { selectedService: service } })
  }

  return (
    <div className="min-h-screen bg-background-dark font-display text-white">
      {/* Header */}
      <div className="px-4 pt-20 pb-12">
        <h1 className="text-5xl md:text-6xl font-black text-center leading-tight mb-4">
          Therapy Session Options
        </h1>
        <p className="text-secondary-text text-center text-lg max-w-2xl mx-auto">
          Choose from our comprehensive range of therapy services designed to meet your unique needs. 
          No signup required to book your first session.
        </p>
      </div>

      {/* Services by Category */}
      <main className="px-4 pb-16">
        {therapyServices.map((categoryGroup, idx) => (
          <div key={idx} className="mb-16 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-highlight mb-8 flex items-center gap-3">
              <span className="text-4xl">{categoryGroup.category.split(' ')[0]}</span>
              {categoryGroup.category.substring(categoryGroup.category.indexOf(' ') + 1)}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryGroup.services.map((service, serviceIdx) => (
                <div 
                  key={serviceIdx}
                  className="glassmorphism rounded-xl p-6 flex flex-col gap-4 hover:transform hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 border border-white/10 hover:border-primary/50"
                >
                  {/* Icon */}
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-4xl">
                      {service.icon}
                    </span>
                    <h3 className="text-lg font-bold text-white">{service.name}</h3>
                  </div>

                  {/* Description */}
                  <p className="text-secondary-text text-sm leading-relaxed">
                    {service.description}
                  </p>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0"></div>

                  {/* Price and Duration */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex flex-col">
                      <span className="text-secondary-text text-xs uppercase tracking-wider">
                        {service.isPackage ? "Total Price" : "Price per session"}
                      </span>
                      <span className="text-3xl font-bold text-highlight">
                        ${service.price}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-secondary-text text-xs uppercase tracking-wider">Duration</span>
                      <div className="text-lg font-semibold text-white">
                        {service.isPackage ? (
                          <span>{service.packageInfo}</span>
                        ) : (
                          <span>{service.duration} mins</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Book Button */}
                  <button
                    onClick={() => handleBookSession(service)}
                    className="w-full mt-4 py-3 rounded-lg bg-gradient-to-r from-primary to-blue-600 text-white font-bold hover:shadow-lg hover:shadow-primary/50 transition-all duration-300 hover:translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">calendar_today</span>
                    Book {service.name.split(' ')[0]}
                  </button>

                  {/* Info Badge */}
                  {service.isPackage && (
                    <div className="inline-flex items-center gap-2 text-xs bg-primary/20 text-primary px-3 py-1 rounded-full w-fit">
                      <span className="material-symbols-outlined text-xs">local_offer</span>
                      Package Deal
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* CTA Section */}
      <div className="px-4 py-16 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey to Calm</h2>
          <p className="text-secondary-text mb-8 text-lg">
            No sign-up needed. Choose a session that fits your schedule, confirm your booking, and connect directly for your private audio session.
          </p>
          <button
            onClick={() => navigate('/booking')}
            className="px-8 py-4 rounded-lg bg-primary text-white font-bold text-lg hover:bg-blue-600 transition-all hover:shadow-lg hover:shadow-primary/50"
          >
            Book a Session Now
          </button>
        </div>
      </div>
    </div>
  )
}
