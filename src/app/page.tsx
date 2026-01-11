"use client";

import React, { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  ArrowRight, 
  Scale, 
  Zap, 
  MessageSquare, 
  Search,
  Swords,
  Award,
  Plus,
  Cpu,
  Globe,
  Hexagon,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

// Feature Card with hover expand like ServiceItem
const FeatureItem = ({ 
  title, 
  description, 
  tags,
  index 
}: { 
  title: string; 
  description: string; 
  tags: string[];
  index: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group border-b border-stone-200 py-10 cursor-pointer"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-3xl md:text-5xl font-serif text-stone-400 group-hover:text-stone-900 transition-colors duration-300">
          {title}
        </h3>
        <motion.div
          animate={{ 
            rotate: isOpen ? 45 : 0, 
            backgroundColor: isOpen ? '#78350f' : 'transparent', 
            borderColor: isOpen ? '#78350f' : '#d6d3d1' 
          }}
          className="w-12 h-12 flex items-center justify-center rounded-full border border-stone-300 transition-colors duration-300"
        >
          <Plus className={`w-5 h-5 transition-colors duration-300 ${isOpen ? 'text-white' : 'text-stone-400'}`} />
        </motion.div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="pt-4 max-w-2xl">
          <p className="text-lg text-stone-600 font-light leading-relaxed mb-6">
            {description}
          </p>
          <div className="flex gap-3 flex-wrap">
            {tags.map((tag, i) => (
              <span key={i} className="text-xs font-mono font-medium text-amber-700 uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-sm">
                [{tag}]
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Step Card Component
const StepCard = ({ 
  number, 
  icon: Icon,
  title, 
  description, 
  accentColor,
  index 
}: { 
  number: string;
  icon: React.ElementType;
  title: string; 
  description: string;
  accentColor: string;
  index: number;
}) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8, delay: index * 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="group cursor-pointer flex flex-col gap-6"
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100">
        <div
          className="absolute inset-0 transition-transform duration-700 ease-[0.22,1,0.36,1] group-hover:scale-105 flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <div className="w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),transparent_70%)] opacity-30 absolute" />
          <div
            className="absolute w-64 h-64 rounded-full blur-[80px] opacity-50"
            style={{ backgroundColor: accentColor }}
          />
          <Icon className="w-24 h-24 relative z-10" style={{ color: accentColor }} strokeWidth={1} />
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />

        <div className="absolute top-6 left-6">
          <span className="text-6xl font-serif font-light" style={{ color: accentColor }}>{number}</span>
        </div>
      </div>

      <div className="flex justify-between items-start border-t border-stone-200 pt-5">
        <div>
          <h3 className="text-3xl font-serif font-medium text-stone-900 mb-2">{title}</h3>
          <p className="text-base text-stone-500 leading-relaxed max-w-sm">{description}</p>
        </div>
      </div>
    </motion.article>
  );
};

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);

  const features = [
    {
      title: "AI Advocates",
      description: "Each technology gets a dedicated AI advocate who researches deeply and argues passionately for their option. They gather evidence, benchmarks, and real-world case studies.",
      tags: ["Deep Research", "Evidence-Based", "Passionate Arguments"]
    },
    {
      title: "Cross-Examination",
      description: "Advocates challenge each other's claims, exposing weaknesses and strengthening the debate with real evidence. No claim goes unchallenged.",
      tags: ["Fact-Checking", "Counter-Arguments", "Rigorous Analysis"]
    },
    {
      title: "Impartial Verdict",
      description: "A neutral AI referee synthesizes all arguments and delivers a balanced, well-reasoned recommendation tailored to your specific context.",
      tags: ["Unbiased", "Comprehensive", "Actionable"]
    },
    {
      title: "Real-Time Research",
      description: "Powered by live web search, ensuring comparisons use the latest information, current best practices, and up-to-date benchmarks.",
      tags: ["Live Data", "Current Info", "Web Search"]
    }
  ];

  const steps = [
    {
      number: "01",
      icon: MessageSquare,
      title: "Ask Your Question",
      description: "Enter any technology comparison. React vs Vue? PostgreSQL vs MongoDB? We handle it all.",
      accentColor: "#0ea5e9"
    },
    {
      number: "02", 
      icon: Search,
      title: "Advocates Research",
      description: "AI advocates dive deep into each option, gathering evidence, benchmarks, and real-world insights.",
      accentColor: "#8b5cf6"
    },
    {
      number: "03",
      icon: Swords, 
      title: "The Debate",
      description: "Advocates cross-examine each other, challenging claims and defending their positions with facts.",
      accentColor: "#f59e0b"
    },
    {
      number: "04",
      icon: Award,
      title: "Final Verdict",
      description: "The referee weighs all arguments and delivers a comprehensive, actionable recommendation.",
      accentColor: "#10b981"
    }
  ];

  return (
    <div className="w-full bg-[#faf9f7] text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900 overflow-hidden relative">
      
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 mix-blend-difference text-white pointer-events-none">
        <div className="max-w-[100rem] mx-auto px-6 md:px-12 py-8 flex justify-between items-center pointer-events-auto">
          <Link href="/" className="text-2xl font-serif italic tracking-tight hover:opacity-80 transition-opacity">
            Tech Referee.
          </Link>

          <nav className="hidden md:flex items-center gap-10 font-mono text-sm uppercase tracking-widest">
            {['Features', 'How It Works', 'GitHub'].map((item) => (
              <a 
                key={item} 
                href={item === 'GitHub' ? 'https://github.com/connectednatural/agents-debate-bench/' : `#${item.toLowerCase().replace(/\s+/g, '-')}`}
                target={item === 'GitHub' ? '_blank' : undefined}
                rel={item === 'GitHub' ? 'noopener noreferrer' : undefined}
                className="hover:text-amber-300 transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          <Link 
            href="/bench" 
            className="hidden md:flex items-center gap-2 border border-white/30 rounded-full px-6 py-2 font-mono text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Launch App
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex flex-col items-center pt-20 overflow-hidden">
        
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-amber-200/50 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-1/4 left-1/3 w-[40vw] h-[40vw] bg-orange-200/50 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[30vw] h-[30vw] bg-yellow-200/40 rounded-full blur-[80px]" />
        </div>

        {/* Hero Content - positioned higher */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-30 text-center px-4 max-w-5xl mx-auto mt-[12vh]"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-4 flex items-center justify-center gap-3 font-mono text-xs md:text-sm text-amber-700 tracking-[0.2em] uppercase"
          >
            <Scale className="w-4 h-4" />
            <span>AI-Powered Technology Debates</span>
          </motion.div>

          <h1 className="font-serif text-[10vw] md:text-[8vw] leading-[0.9] tracking-tighter text-stone-900 mb-6">
            <motion.span
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              Compare
            </motion.span>
            <br />
            <motion.span
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1, delay: 0.4 }}
              className="italic font-light text-amber-700 block"
            >
              With Confidence
            </motion.span>
        </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-lg md:text-xl text-stone-600 max-w-xl mx-auto mb-10 leading-relaxed font-light"
          >
            Stop endless Googling. Let AI advocates debate your technology choices and deliver an impartial verdict.
          </motion.p>

          {/* CTA Buttons - moved here, above the wave */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <Link 
              href="/bench" 
              className="group relative flex items-center gap-3 px-8 py-4 bg-stone-900 text-white rounded-full hover:bg-amber-700 transition-all duration-300 shadow-xl hover:shadow-amber-500/20 hover:-translate-y-1"
            >
              <span className="font-mono text-xs uppercase tracking-widest">Start Comparing</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="#how-it-works" 
              className="group relative flex items-center gap-3 px-8 py-4 border-2 border-stone-300 text-stone-700 rounded-full hover:border-stone-900 hover:text-stone-900 transition-all duration-300 bg-white/50 backdrop-blur-sm"
            >
              <span className="font-mono text-xs uppercase tracking-widest">How It Works</span>
            </a>
          </motion.div>
        </motion.div>

        {/* The Wave Curve - decorative only */}
        <div className="absolute bottom-0 left-0 w-full h-[20vh] z-20 overflow-hidden pointer-events-none">
          <div className="w-[120%] h-full bg-[#faf9f7] absolute -left-[10%] rounded-t-[50%] shadow-[0_-20px_60px_rgba(0,0,0,0.05)]" />
        </div>
      </section>

      {/* Intro Section */}
      <section id="intro" className="relative z-20 py-24 md:py-32 px-6 bg-[#faf9f7]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-3xl md:text-5xl font-medium leading-[1.2] text-stone-800">
            We built an AI debate system that creates <span className="font-serif italic text-amber-700">structured arguments</span> for every technology choice you need to make.
          </p>
          <div className="mt-16 flex flex-wrap justify-center gap-12 text-stone-400">
            {[Cpu, Zap, Globe, MessageSquare].map((Icon, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-12 h-12"
              >
                <Icon className="w-full h-full stroke-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - Project Grid Style */}
      <section id="how-it-works" className="relative z-20 py-20 px-6 md:px-12 max-w-[100rem] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 border-b border-stone-200 pb-8">
          <h2 className="font-serif text-6xl md:text-8xl text-stone-900">
            How It<br/><span className="italic text-stone-400">Works</span>
          </h2>
          <span className="hidden md:block font-mono text-sm text-stone-500 uppercase tracking-widest mb-4">
            [ 4 Step Process ]
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24 md:gap-y-32">
          {steps.map((step, index) => (
            <div key={step.number} className={index % 2 !== 0 ? "md:mt-24" : ""}>
              <StepCard {...step} index={index} />
            </div>
          ))}
        </div>
      </section>

      {/* Features Section - Accordion Style */}
      <section id="features" className="relative z-20 py-32 px-6 md:px-12 bg-stone-50 mt-20">
        <div className="max-w-[100rem] mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
          <div className="md:col-span-4">
            <div className="sticky top-32">
              <h2 className="font-serif text-6xl text-stone-900 mb-8">
                Core<br/><span className="italic text-amber-700">Capabilities</span>
              </h2>
              <p className="text-stone-500 text-lg mb-8 max-w-xs">
                Leveraging multi-agent AI systems to create comprehensive, unbiased technology comparisons.
              </p>
              <Link 
                href="/bench" 
                className="inline-flex items-center gap-2 border-b border-stone-900 pb-1 text-sm font-mono uppercase tracking-widest hover:text-amber-700 hover:border-amber-700 transition-colors"
              >
                Try It Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="md:col-span-8">
            {features.map((feature, index) => (
              <FeatureItem key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-20 py-32 bg-[#faf9f7] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-amber-100/50 rounded-full blur-[150px]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <Scale className="w-20 h-20 mx-auto text-amber-600 stroke-1" />
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-5xl md:text-7xl text-stone-900 mb-6"
          >
            Ready to Make<br/><span className="italic text-amber-700">Better Decisions?</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-stone-600 mb-12 max-w-xl mx-auto font-light"
          >
            Stop second-guessing your technology choices. Let AI advocates debate so you can decide with confidence.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link
              href="/bench"
              className="group inline-flex items-center gap-3 px-10 py-5 bg-stone-900 text-white rounded-full text-lg font-medium hover:bg-amber-700 transition-all duration-300 shadow-2xl hover:shadow-amber-300/30 hover:-translate-y-1"
            >
              <span className="font-mono text-sm uppercase tracking-widest">Start Your First Comparison</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-30 bg-stone-900 text-stone-100 pt-24 pb-12 px-6 md:px-12 rounded-t-[3rem] md:rounded-t-[5rem] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#78350f,transparent_50%)] opacity-20" />

        <div className="relative max-w-[100rem] mx-auto flex flex-col items-center text-center">
          <div className="mb-16 opacity-50">
            <Hexagon className="w-16 h-16 stroke-1 text-amber-400 animate-spin" style={{ animationDuration: '20s' }} />
          </div>

          <h2 className="font-serif text-[8vw] md:text-[6vw] leading-[0.9] text-white mb-12">
            "The best decision is an <br/><span className="italic text-amber-400">informed</span> decision."
          </h2>

          <div className="w-full h-px bg-white/10 max-w-4xl mx-auto mb-16" />

          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-16">
            <div className="text-center">
              <h4 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">Product</h4>
              <div className="flex flex-col gap-2">
                <Link href="/bench" className="text-lg hover:text-amber-400 transition-colors">Launch App</Link>
                <a href="#features" className="text-lg hover:text-amber-400 transition-colors">Features</a>
              </div>
            </div>
            <div className="text-center">
              <h4 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">Resources</h4>
              <div className="flex flex-col gap-2">
                <a href="#how-it-works" className="text-lg hover:text-amber-400 transition-colors">How It Works</a>
                <a 
                  href="https://github.com/connectednatural/agents-debate-bench/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-lg hover:text-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 opacity-40">
            <span className="font-serif italic text-2xl">Tech Referee.</span>
            <span className="font-mono text-[10px] uppercase tracking-widest">Built with Kiro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
