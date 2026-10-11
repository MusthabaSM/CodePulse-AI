import Link from 'next/link';
import styles from './Landing.module.css';

export default function LandingPage() {
  return (
    <div className={styles.landingContainer}>
      
      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.navLogo}>
          <div className={styles.navLogoIcon}></div>
          CodePulse AI
        </div>
        <div className={styles.navLinks}>
          <Link href="#features" className={styles.navLink}>Features</Link>
          <Link href="#roi" className={styles.navLink}>ROI Calculator</Link>
          <Link href="#testimonials" className={styles.navLink}>Testimonials</Link>
          <Link href="/dashboard" className={styles.secondaryButton}>Login</Link>
          <Link href="/dashboard" className={styles.primaryButton}>Book a Demo</Link>
        </div>
      </nav>

      {/* 1. Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}></div>
        <div className={styles.heroTag}>CodePulse AI 2.0 is now live ✨</div>
        <h1 className={styles.heroTitle}>Predict Software Problems<br/>Before They Cost Millions.</h1>
        <p className={styles.heroSubtitle}>
          AI-powered engineering intelligence platform for identifying technical debt, bug-prone modules, maintenance costs, and refactoring opportunities.
        </p>
        <div className={styles.heroActions}>
          <Link href="/dashboard" className={`${styles.primaryButton} ${styles.heroPrimaryBtn}`}>Start Free Trial</Link>
          <Link href="#how-it-works" className={`${styles.secondaryButton} ${styles.heroPrimaryBtn}`}>See How it Works</Link>
        </div>
      </section>

      {/* 2. Trusted By */}
      <section className={styles.trustedBy}>
        <div className={styles.trustedText}>TRUSTED BY ENGINEERING TEAMS AT</div>
        <div className={styles.logoTicker}>
          <div className={styles.companyLogo}>AcmeCorp</div>
          <div className={styles.companyLogo}>GlobalTech</div>
          <div className={styles.companyLogo}>StarkInd</div>
          <div className={styles.companyLogo}>WayneEnt</div>
          <div className={styles.companyLogo}>Umbrella</div>
        </div>
      </section>

      {/* 3. Problem Statement */}
      <section className={styles.section} id="problem">
        <div className={styles.problemGrid}>
          <div className={styles.problemText}>
            <h3>Technical debt is a silent killer.</h3>
            <p>Most engineering teams rely on intuition to decide what to refactor. This leads to bikeshedding over style while ignoring structural decay that actively slows down feature velocity.</p>
            <p>CodePulse AI replaces guesswork with financial and empirical data.</p>
          </div>
          <div className={styles.problemStats}>
            <div className={styles.statBox}>
              <div className={styles.statBoxNumber}>42%</div>
              <div style={{color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)'}}>Developer time wasted dealing with technical debt and bad code.</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statBoxNumber}>$3T</div>
              <div style={{color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)'}}>Estimated global cost of poor software quality annually.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features */}
      <section className={styles.section} id="features">
        <h2 className={styles.sectionTitle}>Engineering Intelligence</h2>
        <p className={styles.sectionSubtitle}>Everything a CTO needs to stop fires before they start.</p>
        
        <div className={styles.bentoGrid}>
          <div className={`${styles.bentoCard} ${styles.bentoLarge}`}>
            <div className={styles.bentoIcon}>🔮</div>
            <h3 className={styles.bentoTitle}>Bug Risk Prediction</h3>
            <p className={styles.bentoDesc}>Our XGBoost machine learning model analyzes your Git history, developer entropy, and cyclomatic complexity to predict which files will cause production bugs in the next 30 days with 85% accuracy.</p>
          </div>
          
          <div className={styles.bentoCard}>
            <div className={styles.bentoIcon}>💰</div>
            <h3 className={styles.bentoTitle}>Debt Financialization</h3>
            <p className={styles.bentoDesc}>Translate code smells into dollars. Know exactly how much specific technical debt is costing you in maintenance overhead.</p>
          </div>
          
          <div className={styles.bentoCard}>
            <div className={styles.bentoIcon}>🎯</div>
            <h3 className={styles.bentoTitle}>Refactoring ROI</h3>
            <p className={styles.bentoDesc}>Prioritize refactoring based on code churn. Stop fixing terrible code that never changes.</p>
          </div>
          
          <div className={styles.bentoCard}>
            <div className={styles.bentoIcon}>📈</div>
            <h3 className={styles.bentoTitle}>Team Velocity Analysis</h3>
            <p className={styles.bentoDesc}>Correlate accumulated tech debt directly with sprint velocity slowdowns.</p>
          </div>
          
          <div className={`${styles.bentoCard} ${styles.bentoLarge}`}>
            <div className={styles.bentoIcon}>🤖</div>
            <h3 className={styles.bentoTitle}>AI Consultant</h3>
            <p className={styles.bentoDesc}>Chat directly with your codebase architecture. Ask questions like &quot;What happens if we rewrite the auth service?&quot; and get evidence-based answers backed by static analysis.</p>
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section className={styles.section} id="how-it-works">
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <p className={styles.sectionSubtitle}>Zero configuration. Instant insights.</p>
        
        <div className={styles.stepsContainer}>
          <div className={styles.stepItem}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h4>Connect Your VCS</h4>
              <p>Oauth into GitHub, GitLab, or Bitbucket. We support multi-organization and monorepo setups out of the box.</p>
            </div>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h4>Analysis Engine Runs</h4>
              <p>Our Python-based AST parsers and Git history analyzers scan your code without ever storing it persistently.</p>
            </div>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h4>Review the Dashboard</h4>
              <p>Get immediate visibility into risk hotspots, technical debt costs, and actionable refactoring targets.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Screenshots */}
      <section className={styles.section}>
        <div className={styles.screenshotWrapper}>
          <div className={styles.screenshotHeader}>
            <div className={`${styles.dot} ${styles.dotRed}`}></div>
            <div className={`${styles.dot} ${styles.dotYellow}`}></div>
            <div className={`${styles.dot} ${styles.dotGreen}`}></div>
          </div>
          <div className={styles.screenshotImage}>
            [ Application Interface Preview ]
          </div>
        </div>
      </section>

      {/* 7. ROI Calculator */}
      <section className={styles.section} id="roi">
        <h2 className={styles.sectionTitle}>Calculate Your ROI</h2>
        <p className={styles.sectionSubtitle}>See how much you could save by proactively managing code health.</p>
        
        <div className={styles.roiCalculator}>
          <div className={styles.calcInputs}>
            <div className={styles.calcInputGroup}>
              <label>Number of Developers</label>
              <input type="number" defaultValue={50} className={styles.calcInput} />
            </div>
            <div className={styles.calcInputGroup}>
              <label>Average Developer Salary ($)</label>
              <input type="number" defaultValue={120000} className={styles.calcInput} />
            </div>
            <div className={styles.calcInputGroup}>
              <label>Estimated Time Wasted on Debt (%)</label>
              <input type="number" defaultValue={20} className={styles.calcInput} />
            </div>
            <button className={styles.primaryButton} style={{marginTop: 'var(--spacing-4)'}}>Calculate Savings</button>
          </div>
          <div className={styles.calcResult}>
            <div style={{color: 'var(--color-text-secondary)'}}>Potential Annual Savings</div>
            <div className={styles.resultValue}>$1,200,000</div>
            <div style={{fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)'}}>Based on a 100% reduction in wasted time.</div>
          </div>
        </div>
      </section>

      {/* 8. Business Impact */}
      <section className={styles.section}>
        <div className={styles.impactGrid}>
          <div className={styles.impactCard}>
            <h4>3x</h4>
            <p>Faster Onboarding</p>
          </div>
          <div className={styles.impactCard}>
            <h4>-40%</h4>
            <p>Production Incidents</p>
          </div>
          <div className={styles.impactCard}>
            <h4>+25%</h4>
            <p>Feature Velocity</p>
          </div>
          <div className={styles.impactCard}>
            <h4>100%</h4>
            <p>Visibility</p>
          </div>
        </div>
      </section>

      {/* 9. Testimonials */}
      <section className={styles.section} id="testimonials">
        <h2 className={styles.sectionTitle}>What Engineering Leaders Say</h2>
        
        <div className={styles.testimonialGrid}>
          <div className={styles.testimonialCard}>
            <p className={styles.quote}>&quot;CodePulse AI completely changed how we run our engineering org. Instead of arguing over style, we use data to prioritize refactoring that actually impacts our bottom line.&quot;</p>
            <div className={styles.author}>
              <div className={styles.authorAvatar}></div>
              <div className={styles.authorInfo}>
                <h5>Sarah Jenkins</h5>
                <span>VP Engineering at DataFlow</span>
              </div>
            </div>
          </div>
          <div className={styles.testimonialCard}>
            <p className={styles.quote}>&quot;The Bug Risk Prediction model is uncanny. It highlighted three files that were scheduled for a major release, and sure enough, we caught critical logic flaws before deployment.&quot;</p>
            <div className={styles.author}>
              <div className={styles.authorAvatar}></div>
              <div className={styles.authorInfo}>
                <h5>David Chen</h5>
                <span>CTO at FinScale</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        
        <div className={styles.faqList}>
          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>Do you store our source code?</div>
            <div className={styles.faqAnswer}>No. CodePulse AI analyzes ASTs and Git metadata. We never store raw source code persistently on our servers.</div>
          </div>
          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>What languages do you support?</div>
            <div className={styles.faqAnswer}>We currently support JavaScript, TypeScript, Python, Go, and Java. We are constantly adding support for new languages.</div>
          </div>
          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>Does it integrate with CI/CD?</div>
            <div className={styles.faqAnswer}>Yes, you can set up quality gates in GitHub Actions or GitLab CI to block PRs that increase bug risk beyond an acceptable threshold.</div>
          </div>
        </div>
      </section>

      {/* 11. Contact & Footer */}
      <section className={styles.ctaSection}>
        <h2 className={styles.sectionTitle}>Ready to transform your codebase?</h2>
        <p className={styles.sectionSubtitle}>Join hundreds of engineering teams shipping faster with less risk.</p>
        <Link href="/dashboard" className={`${styles.primaryButton} ${styles.heroPrimaryBtn}`}>Start Your Free Trial</Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.navLogo}>
          <div className={styles.navLogoIcon} style={{width: '16px', height: '16px'}}></div>
          CodePulse AI
        </div>
        <div>
          &copy; {new Date().getFullYear()} CodePulse AI Inc. All rights reserved.
        </div>
        <div style={{display: 'flex', gap: 'var(--spacing-4)'}}>
          <Link href="#">Twitter</Link>
          <Link href="#">LinkedIn</Link>
          <Link href="#">GitHub</Link>
        </div>
      </footer>
    </div>
  );
}
