import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.heading}>Privacy Policy</Text>
        <Text style={styles.meta}>Effective Date: April 7, 2026 · Last Updated: April 7, 2026</Text>

        <Section title="1. Who We Are">
          <P>
            CalTrack AI ("we", "us", or "our") is developed and operated by AevonTech. This Privacy
            Policy explains how we collect, use, store, and protect your personal information when you
            use the CalTrack AI mobile application ("the App").
          </P>
          <P>
            By using the App, you agree to the collection and use of information as described in this
            policy. If you do not agree, please do not use the App.
          </P>
        </Section>

        <Section title="2. Information We Collect">
          <P>We collect the following categories of information:</P>

          <Text style={styles.subTitle}>Account Information</Text>
          <Bullet>Email address (required to create an account)</Bullet>
          <Bullet>Full name (provided during registration)</Bullet>
          <Bullet>Password (stored securely via Firebase Authentication — we never see it in plain text)</Bullet>

          <Text style={styles.subTitle}>Health & Nutrition Data</Text>
          <Bullet>Age, gender, height, and weight (provided during onboarding)</Bullet>
          <Bullet>Dietary goals, activity level, and food preferences</Bullet>
          <Bullet>Meal logs including food names, calories, and macronutrients</Bullet>
          <Bullet>Food photos you scan for AI analysis (processed in real time; not stored permanently)</Bullet>

          <Text style={styles.subTitle}>Usage Data</Text>
          <Bullet>App feature usage (e.g. meal logging, AI scans)</Bullet>
          <Bullet>Device type and operating system version</Bullet>
          <Bullet>App version and crash reports (if applicable)</Bullet>
        </Section>

        <Section title="3. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <Bullet>Provide, personalise, and improve the App and its features</Bullet>
          <Bullet>Generate personalised nutrition targets and AI-powered meal recommendations</Bullet>
          <Bullet>Sync your data securely across your devices</Bullet>
          <Bullet>Process subscription payments and manage your CalTrack Pro plan</Bullet>
          <Bullet>Send password reset emails when requested</Bullet>
          <Bullet>Respond to support requests and improve the App based on feedback</Bullet>
          <P>
            We do not use your health data for advertising, profiling, or any purpose beyond providing
            the App's core functionality.
          </P>
        </Section>

        <Section title="4. Third-Party Services">
          <P>We use the following third-party services to operate the App. Each has its own privacy policy:</P>

          <Text style={styles.subTitle}>Google Firebase</Text>
          <P>
            We use Firebase Authentication to manage accounts and Firebase Realtime Database to store
            your nutrition data. Your data is stored in Google Cloud infrastructure with encryption
            at rest and in transit.
          </P>
          <Bullet>Firebase Privacy Policy: firebase.google.com/support/privacy</Bullet>

          <Text style={styles.subTitle}>Google Gemini AI</Text>
          <P>
            When you scan a food photo or request AI meal plans, image data and nutrition context are
            sent to Google's Gemini AI API. Images are not stored after analysis. Text prompts may be
            used by Google to improve their services per their terms.
          </P>
          <Bullet>Google AI Terms: ai.google.dev/terms</Bullet>

          <Text style={styles.subTitle}>RevenueCat</Text>
          <P>
            We use RevenueCat to manage CalTrack Pro subscriptions. Subscription status and purchase
            receipts are processed by RevenueCat. We do not store your payment card details.
          </P>
          <Bullet>RevenueCat Privacy Policy: revenuecat.com/privacy</Bullet>

          <Text style={styles.subTitle}>Apple App Store / Google Play</Text>
          <P>
            Subscription billing is handled entirely by Apple or Google. We receive only confirmation
            of your subscription status, not your payment details.
          </P>
        </Section>

        <Section title="5. Data Sharing">
          <P>
            We do not sell, trade, or rent your personal information to third parties. We only share
            data with the third-party service providers listed above, strictly as needed to operate the
            App.
          </P>
          <P>
            We may disclose information if required to do so by law or in response to valid legal
            requests.
          </P>
        </Section>

        <Section title="6. Data Retention">
          <P>
            We retain your data for as long as your account exists. When you delete your account
            through the App (Menu → Delete Account), your authentication record and all associated
            nutrition data are permanently and irreversibly deleted from our systems.
          </P>
          <P>
            Guest-mode data is stored only on your device and is removed when you uninstall the App.
          </P>
        </Section>

        <Section title="7. Your Rights">
          <P>Depending on your location, you may have the right to:</P>
          <Bullet>Access the personal data we hold about you</Bullet>
          <Bullet>Correct inaccurate information via your account profile</Bullet>
          <Bullet>Delete your data by deleting your account (Menu → Delete Account)</Bullet>
          <Bullet>Withdraw consent for data processing by deleting your account</Bullet>
          <Bullet>Request a copy of your data by contacting us at the address below</Bullet>
          <P>
            To exercise any right not covered by the in-app controls, please contact us at
            support@aevontech.com.
          </P>
        </Section>

        <Section title="8. Children's Privacy">
          <P>
            CalTrack AI is not intended for use by children under the age of 13. We do not knowingly
            collect personal information from children under 13. If you believe a child has provided
            us with personal information, please contact us and we will delete it promptly.
          </P>
        </Section>

        <Section title="9. Security">
          <P>
            We take the security of your data seriously. All data is transmitted over encrypted HTTPS
            connections. Your data is stored in Google Firebase, which maintains SOC 2 Type II and
            ISO 27001 compliance.
          </P>
          <P>
            While we take commercially reasonable precautions, no method of electronic storage or
            transmission is 100% secure. We encourage you to use a strong, unique password and keep
            your login credentials confidential.
          </P>
        </Section>

        <Section title="10. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes by updating the "Last Updated" date at the top of this policy. Continued use of
            the App after changes are posted constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section title="11. Contact Us">
          <P>
            If you have any questions, concerns, or requests regarding this Privacy Policy or your
            personal data, please contact us:
          </P>
          <Bullet>Email: support@aevontech.com</Bullet>
          <Bullet>Developer: AevonTech</Bullet>
        </Section>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.ghost },
  scroll: { padding: 22, paddingBottom: 48 },
  heading: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: Palette.obsidian,
    marginBottom: 6,
  },
  meta: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Palette.dusk,
    marginBottom: 28,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Palette.iris,
    marginBottom: 10,
  },
  subTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Palette.obsidian,
    marginTop: 12,
    marginBottom: 6,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Palette.obsidian,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Palette.iris,
    lineHeight: 22,
    marginTop: 0,
  },
  bulletText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Palette.obsidian,
    lineHeight: 22,
  },
});
