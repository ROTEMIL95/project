import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { CustomerInquiry } from '@/api/entities';
import { SendEmail } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LifeBuoy, Send, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function SupportPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [appOwnerEmail, setAppOwnerEmail] = useState(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch current user details if logged in
                const user = await User.me();
                if (user) {
                    setCurrentUser(user);
                    setFormData(prev => ({
                        ...prev,
                        name: user.full_name || '',
                        email: user.email || ''
                    }));
                }
            } catch (e) {
                console.info("User not logged in, proceeding as guest.");
            }

            try {
                 // Fetch the app owner's email to send the notification
                const admins = await User.filter({ role: 'admin' }, '-created_date', 1);
                if (admins.length > 0 && admins[0].email) {
                    setAppOwnerEmail(admins[0].email);
                } else {
                     setError("לא נמצאה כתובת מייל של מנהל המערכת. לא ניתן יהיה לשלוח פניות.");
                }
            } catch(e) {
                setError("שגיאה בטעינת פרטי מנהל המערכת.");
            }
        };
        fetchInitialData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            setError("נא למלא את כל שדות החובה.");
            return;
        }

        if (!appOwnerEmail) {
             setError("לא ניתן לשלוח את הפנייה. כתובת המייל של מנהל המערכת אינה מוגדרת.");
             return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // 1. Create a record in the CustomerInquiry entity
            await CustomerInquiry.create({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                subject: formData.subject,
                message: formData.message,
                status: "חדש"
            });

            // 2. Send an email to the app owner
            const emailBody = `
                <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
                    <h2>התקבלה פניית תמיכה חדשה</h2>
                    <p><strong>מאת:</strong> ${formData.name}</p>
                    <p><strong>אימייל:</strong> ${formData.email}</p>
                    <p><strong>טלפון:</strong> ${formData.phone || 'לא נמסר'}</p>
                    <hr>
                    <h3>נושא: ${formData.subject}</h3>
                    <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                        <p>${formData.message.replace(/\n/g, '<br>')}</p>
                    </div>
                    <hr>
                    <p>ניתן לצפות ולנהל את הפנייה דרך דשבורד הניהול באפליקציה.</p>
                </div>
            `;
            
            await SendEmail({
                to: appOwnerEmail,
                subject: `פניית תמיכה חדשה: ${formData.subject}`,
                body: emailBody
            });

            setSuccess(true);
        } catch (err) {
            console.error("Failed to submit inquiry:", err);
            setError("אירעה שגיאה בשליחת הפנייה. אנא נסה שוב.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Card className="w-full max-w-lg text-center p-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <CardTitle className="text-2xl">הפנייה נשלחה בהצלחה!</CardTitle>
                    <CardDescription className="mt-2 text-lg">
                        ניצור איתך קשר בהקדם.
                    </CardDescription>
                    <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-6">
                        חזרה לדף הבית
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
             <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                חזרה
            </Button>
            <Card className="max-w-3xl mx-auto shadow-lg">
                <CardHeader className="text-center bg-gray-50/50">
                    <LifeBuoy className="w-12 h-12 mx-auto text-indigo-600" />
                    <CardTitle className="text-3xl font-bold mt-2">יצירת קשר ותמיכה</CardTitle>
                    <CardDescription className="text-lg">יש לך שאלה? אנחנו כאן כדי לעזור.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">שם מלא *</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">כתובת מייל *</Label>
                            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="phone">טלפון (אופציונלי)</Label>
                            <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject">נושא הפנייה *</Label>
                            <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="message">הודעה *</Label>
                        <Textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={6} required />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertTitle>שגיאה</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Button onClick={handleSubmit} disabled={loading} className="w-full text-lg py-6">
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-2" />}
                        {loading ? 'שולח...' : 'שלח פנייה'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}