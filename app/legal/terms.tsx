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

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.heading}>Terms of Service</Text>
        <Text style={styles.meta}>Effective Date: April 7, 2026 · Last Updated: April 7, 2026</Text>

        <Section title="1. Acceptance of Terms">
          <P>
            By downloading, installing, or using CalTrack AI (the "App"), you agree to be bound by
            these Terms of Service ("Terms"). These Terms form a legal agreement between you and
            AevonTech ("we", "us", or "our"). If you do not agree to these Terms, do not use the App.
          </P>
          <P>
            We may update these Terms from time to time. Continued use of the App after changes are
            posted constitutes acceptance of the updated Terms.
          </P>
        </Section>

        <Section title="2. Description of Service">
          <P>
            CalTrack AI is a nutrition tracking application that allows you to:
          </P>
          <Bullet>Log meals and track daily calorie and macro intake</Bullet>
          <Bullet>Scan food photos using AI for nutritional estimates</Bullet>
          <Bullet>Receive personalised nutrition targets and meal recommendations</Bullet>
          <Bullet>Access weekly meal plans and grocery suggestions</Bullet>
          <Bullet>Track progress over time through insights and trends</Bullet>
          <P>
            Some features require a CalTrack Pro subscription. Free features remain available to all
            users without a subscription.
          </P>
        </Section>

        <Section title="3. Not Medical Advice">
          <P>
            CalTrack AI is designed for general nutrition tracking and informational purposes only.
            The App is not a substitute for professional medical, dietary, or healthcare advice,
            diagnosis, or treatment.
          </P>
          <P>
            Always consult a qualified healthcare professional before making significant dietary
            changes, especially if you have a medical condition, are pregnant, or are managing a
            health concern. Nutritional estimates provided by the AI are approximate and may not be
            accurate for all foods or portion sizes.
          </P>
          <P>
            Reliance on any information provided by the App is solely at your own risk.
          </P>
        </Section>

        <Section title="4. Eligibility">
          <P>
            You must be at least 13 years old to use CalTrack AI. By using the App, you confirm that
            you are 13 years of age or older. If you are between 13 and 18, you confirm that you have
            your parent or guardian's permission to use the App.
          </P>
          <P>
            We do not knowingly collect personal information from children under 13. If you believe
            a child under 13 is using the App, please contact us immediately.
          </P>
        </Section>

        <Section title="5. Account Responsibilities">
          <P>When you create an account, you agree to:</P>
          <Bullet>Provide accurate and complete information during registration</Bullet>
          <Bullet>Keep your login credentials confidential and not share your account</Bullet>
          <Bullet>Notify us immediately of any unauthorised use of your account</Bullet>
          <Bullet>Be responsible for all activity that occurs under your account</Bullet>
          <P>
            You may delete your account at any time through the App (Menu → Delete Account). Account
            deletion is permanent and irreversible.
          </P>
        </Section>

        <Section title="6. Subscriptions and Payments">
          <Text style={styles.subTitle}>CalTrack Pro</Text>
          <P>
            CalTrack Pro is a paid subscription that unlocks premium features including AI meal
            scanning, weekly insights, and meal planning. Subscription options include monthly,
            annual, and lifetime plans.
          </P>

          <Text style={styles.subTitle}>Free Trial</Text>
          <P>
            New subscribers may be eligible for a free trial period. Your subscription will
            automatically renew at the end of the trial unless you cancel at least 24 hours before
            the trial ends.
          </P>

          <Text style={styles.subTitle}>Billing</Text>
          <Bullet>Subscriptions are billed through the Apple App Store or Google Play Store</Bullet>
          <Bullet>Payment is charged to your store account upon purchase confirmation</Bullet>
          <Bullet>Subscriptions auto-renew unless cancelled at least 24 hours before renewal</Bullet>
          <Bullet>Manage or cancel your subscription in your App Store or Google Play settings</Bullet>

          <Text style={styles.subTitle}>Refunds</Text>
          <P>
            All purchases are final unless required by applicable law. Refund requests are handled
            by Apple or Google according to their respective refund policies. We do not process
            refunds directly.
          </P>
        </Section>

        <Section title="7. Acceptable Use">
          <P>You agree not to:</P>
          <Bullet>Use the App for any unlawful purpose or in violation of these Terms</Bullet>
          <Bullet>Attempt to reverse-engineer, decompile, or extract source code from the App</Bullet>
          <Bullet>Upload or transmit harmful, offensive, or illegal content</Bullet>
          <Bullet>Attempt to gain unauthorised access to our systems or other users' data</Bullet>
          <Bullet>Use the App in any way that could damage, disable, or impair our services</Bullet>
          <Bullet>Misrepresent your identity or impersonate another person</Bullet>
        </Section>

        <Section title="8. Intellectual Property">
          <P>
            All content, features, design, and functionality of CalTrack AI — including but not
            limited to text, graphics, logos, icons, and software — are owned by AevonTech and are
            protected by applicable intellectual property laws.
          </P>
          <P>
            We grant you a limited, non-exclusive, non-transferable licence to use the App on your
            personal device for personal, non-commercial purposes in accordance with these Terms.
          </P>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <P>
            The App is provided on an "as is" and "as available" basis without warranties of any
            kind, either express or implied. We do not warrant that the App will be uninterrupted,
            error-free, or free of viruses or other harmful components.
          </P>
          <P>
            We make no warranties regarding the accuracy of nutritional information provided by the
            AI analysis features. Calorie and macro estimates are approximations only.
          </P>
        </Section>

        <Section title="10. Limitation of Liability">
          <P>
            To the fullest extent permitted by applicable law, AevonTech shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising from your use
            of or inability to use the App, even if we have been advised of the possibility of such
            damages.
          </P>
          <P>
            Our total liability to you for any claim arising from your use of the App shall not
            exceed the amount you paid us in the twelve months preceding the claim, or £10 (GBP),
            whichever is greater.
          </P>
        </Section>

        <Section title="11. Termination">
          <P>
            We reserve the right to suspend or terminate your access to the App at any time, with or
            without notice, if we reasonably believe you have violated these Terms or engaged in
            conduct harmful to other users or to us.
          </P>
          <P>
            You may stop using the App at any time. You can delete your account through Menu → Delete
            Account.
          </P>
        </Section>

        <Section title="12. Governing Law">
          <P>
            These Terms are governed by and construed in accordance with the laws of England and
            Wales. Any disputes arising from these Terms or the use of the App shall be subject to
            the exclusive jurisdiction of the courts of England and Wales.
          </P>
        </Section>

        <Section title="13. Contact Us">
          <P>
            If you have any questions about these Terms of Service, please contact us:
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
  },
  bulletText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Palette.obsidian,
    lineHeight: 22,
  },
});
