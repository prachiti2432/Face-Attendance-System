// Auto Notifications System
// Email notifications, SMS alerts, and daily summaries

import { supabase } from '../../lib/supabaseClient.js';

/**
 * Send email notification (using Supabase Edge Functions or external service)
 * @param {string} to 
 * @param {string} subject 
 * @param {string} body 
 */
export async function sendEmailNotification(to, subject, body) {
  try {
    // In a real implementation, you would call a Supabase Edge Function
    // or use a service like SendGrid, AWS SES, etc.
    // For now, we'll log it and store in database for processing

    const { error } = await supabase
      .from('notifications')
      .insert([{
        type: 'email',
        recipient: to,
        subject: subject,
        body: body,
        status: 'pending'
      }]);

    if (error) {
      console.error('Error queuing email notification:', error);
      return false;
    }

    console.log(`Email notification queued for ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

/**
 * Send SMS alert (using external service)
 * @param {string} phoneNumber 
 * @param {string} message 
 */
export async function sendSMSAlert(phoneNumber, message) {
  try {
    // In a real implementation, use Twilio, AWS SNS, or similar
    // For now, we'll log it and store in database

    const { error } = await supabase
      .from('notifications')
      .insert([{
        type: 'sms',
        recipient: phoneNumber,
        subject: 'Attendance Alert',
        body: message,
        status: 'pending'
      }]);

    if (error) {
      console.error('Error queuing SMS notification:', error);
      return false;
    }

    console.log(`SMS notification queued for ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending SMS alert:', error);
    return false;
  }
}

/**
 * Check attendance percentage and send alerts if below threshold
 * @param {string} studentName 
 * @param {string} subject 
 * @param {number} attendancePercentage 
 * @param {string} email 
 * @param {string} phoneNumber 
 */
export async function checkAndNotifyLowAttendance(studentName, subject, attendancePercentage, email, phoneNumber) {
  const THRESHOLD = 75; // 75% threshold

  if (attendancePercentage < THRESHOLD) {
    const emailSubject = `Low Attendance Alert: ${studentName}`;
    const emailBody = `
Dear ${studentName},

Your attendance in ${subject} is currently ${attendancePercentage.toFixed(1)}%, which is below the required 75% threshold.

Please ensure regular attendance to maintain your academic standing.

Best regards,
Face Sentinel Attendance System
    `;

    const smsMessage = `Alert: ${studentName}'s attendance in ${subject} is ${attendancePercentage.toFixed(1)}% (below 75%).`;

    // Send notifications
    if (email) {
      await sendEmailNotification(email, emailSubject, emailBody);
    }

    if (phoneNumber) {
      await sendSMSAlert(phoneNumber, smsMessage);
    }

    return true;
  }

  return false;
}

/**
 * Send daily attendance summary to faculty
 * @param {string} facultyEmail 
 * @param {Array} attendanceData 
 */
export async function sendDailySummary(facultyEmail, attendanceData) {
  const subject = 'Daily Attendance Summary';

  let body = 'Daily Attendance Summary\n\n';
  body += `Date: ${new Date().toLocaleDateString()}\n\n`;
  body += 'Attendance Records:\n';
  body += '-------------------\n';

  attendanceData.forEach(record => {
    body += `${record.student_name}: ${record.status} (${record.time})\n`;
  });

  body += '\n\nBest regards,\nFace Sentinel Attendance System';

  return await sendEmailNotification(facultyEmail, subject, body);
}

/**
 * Get student contact information
 * @param {string} studentName 
 */
async function getStudentContacts(studentName) {
  const { data, error } = await supabase
    .from('students')
    .select('email, phone_number, parent_email, parent_phone')
    .eq('name', studentName)
    .single();

  if (error) {
    console.error('Error fetching student contacts:', error);
    return null;
  }

  return data;
}

/**
 * Notify parents about low attendance
 * @param {string} studentName 
 * @param {string} subject 
 * @param {number} attendancePercentage 
 */
export async function notifyParents(studentName, subject, attendancePercentage) {
  const contacts = await getStudentContacts(studentName);
  if (!contacts) return false;

  const message = `Your child ${studentName}'s attendance in ${subject} is ${attendancePercentage.toFixed(1)}% (below 75%).`;

  if (contacts.parent_email) {
    await sendEmailNotification(contacts.parent_email, `Attendance Alert for ${studentName}`, message);
  }

  if (contacts.parent_phone) {
    await sendSMSAlert(contacts.parent_phone, message);
  }

  return true;
}
