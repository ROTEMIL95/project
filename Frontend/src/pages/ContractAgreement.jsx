
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { User } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { FileSignature, Save, Printer, FileText, Loader2, PlusCircle, Trash2, AlertCircle, CheckCircle, DollarSign, Building, Image as ImageIcon, Upload, X, Settings, User as UserIcon, Phone, Share2, Globe, Facebook, Instagram, Paintbrush, Lightbulb, Wrench, Hammer } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const DEFAULT_CONTRACT_TEMPLATE = `
<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; color: #333; max-width: 800px; margin: auto;">

  <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #4a90e2; padding-bottom: 20px;">
    <h1 style="font-size: 28px; color: #4a90e2; margin: 0;">הסכם לביצוע עבודות קבלנות</h1>
    <p style="font-size: 16px; color: #555; margin-top: 5px;">מסמך זה מהווה הסכם משפטי מחייב</p>
  </div>

  <p style="margin-bottom: 20px;"><strong>תאריך:</strong> [תאריך]</p>
  <p style="margin-bottom: 30px;"><strong>מספר הסכם:</strong> [מספר הסכם]</p>

  <h2 style="font-size: 20px; color: #4a90e2; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px;">צדדי ההסכם</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
    <tr style="vertical-align: top;">
      <td style="width: 50%; padding-right: 10px;">
        <h3 style="font-size: 16px; margin-bottom: 10px;"><strong>הקבלן (צד א'):</strong></h3>
        <p><strong>שם:</strong> [שם החברה]</p>
        <p><strong>ח.פ./ע.מ.:</strong> [מספר עסק]</p>
        <p><strong>כתובת:</strong> [כתובת החברה]</p>
        <p><strong>טלפון:</strong> [טלפון החברה]</p>
        <p><strong>דוא"ל:</strong> [אימייל החברה]</p>
      </td>
      <td style="width: 50%; padding-left: 10px;">
        <h3 style="font-size: 16px; margin-bottom: 10px;"><strong>המזמין (צד ב'):</strong></h3>
        <p><strong>שם:</strong> [שם הלקוח]</p>
        <p><strong>ת.ז:</strong> [ת.ז. לקוח]</p>
        <p><strong>כתובת הפרויקט:</strong> [כתובת הפרויקט]</p>
        <p><strong>טלפון:</strong> [טלפון הלקוח]</p>
        <p><strong>דוא"ל:</strong> [אימייל הלקוח]</p>
      </td>
    </tr>
  </table>

  <p>שנחתם ביום [יום בשבוע], [יום] בחודש [חודש] [שנה].</p>

  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
    <p><strong>הואיל</strong> והקבלן עוסק בביצוע עבודות בנייה ושיפוצים;</p>
    <p><strong>והואיל</strong> והמזמין מעוניין להזמין מהקבלן ביצוע עבודות כמפורט בהסכם זה ובהצעת המחיר המצורפת (נספח א');</p>
    <p><strong>לפיכך, הוסכם, הוצהר והותנה בין הצדדים כדלקמן:</strong></p>
  </div>

  <h2 style="font-size: 20px; color: #4a90e2; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px;">1. מהות ההסכם</h2>
  <p>המזמין מזמין בזאת מהקבלן, והקבלן מקבל על עצמו לבצע את העבודות המפורטות בנספח א' להסכם זה (להלן: "העבודות"). נספח א' מהווה חלק בלתי נפרד מהסכם זה.</p>

  <h2 style="font-size: 20px; color: #4a90e2; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px;">2. התמורה ותנאי התשלום</h2>
  <p>2.1. סך התמורה עבור ביצוע מלא של העבודות הינו <strong>[סכום סופי] ₪</strong> (כולל מע"מ).</p>
  <p>2.2. התמורה תשולם בהתאם ללוח התשלומים המפורט בנספח א'.</p>
  <p>2.3. איחור בתשלום יגרור ריבית פיגורים בשיעור של [שיעור ריבית]% לחודש.</p>
  
  <h2 style="font-size: 20px; color: #4a90e2; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px;">3. לוחות זמנים</h2>
  <p>3.1. תאריך התחלת העבודות: <strong>[תאריך התחלה]</strong>.</p>
  <p>3.2. תאריך סיום משוער: <strong>[תאריך סיום]</strong>.</p>
  <p>3.3. עיכובים שאינם בשליטת הקבלן (כוח עליון, עיכובים באספקת חומרים ע"י המזמין וכו') לא ייחשבו כהפרת הסכם ויביאו לדחיית מועד הסיום בהתאם.</p>
</div>
`;

const DEFAULT_CONTRACTOR_COMMITMENTS = `• לבצע את העבודות במיומנות, במקצועיות ובאיכות גבוהה.
• להשתמש בחומרים איכותיים ותקניים בלבד.
• לפעול בהתאם להוראות כל דין, כולל תקנות בטיחות בעבודה.
• לשמור על ניקיון סביבת העבודה ולפנות פסולת בסיום הפרויקט.
• להחזיק בביטוח אחריות מקצועית וביטוח קבלנים מתאים.`;

const DEFAULT_CLIENT_COMMITMENTS = `• לאפשר לקבלן גישה חופשית ורציפה לאתר העבודה.
• לשלם את התמורה במועדים שנקבעו.
• לספק את כל האישורים וההיתרים הנדרשים מהרשויות, אלא אם סוכם אחרת.
• לשתף פעולה עם הקבלן ולקבל החלטות בזמן סביר.`;

const EMPTY_CONTRACT_TEMPLATE = `<p><br></p>`;

export default function ContractAgreementPage() {
  const navigate = useNavigate();
  const [contractText, setContractText] = useState('');
  const [contractorCommitments, setContractorCommitments] = useState('');
  const [clientCommitments, setClientCommitments] = useState('');
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    companyOwnerName: '',
    businessNumber: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: '',
    specialization: '',
    facebookUrl: '',
    instagramUrl: ''
  });
  
  const [commitments, setCommitments] = useState({
    cat_paint_plaster: "",
    cat_tiling: "",
    cat_demolition: "",
    cat_electricity: "",
    cat_plumbing: "",
    cat_construction: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);

  const generateMilestoneName = (position, paymentRule) => {
    if (position === 'first') {
      switch (paymentRule.type) {
        case 'on_approval':
          return 'תשלום ראשון - בעת אישור הצעה';
        case 'days_before_start':
          return `תשלום ראשון - ${paymentRule.days} ימים לפני תחילת עבודה`;
        default:
          return 'תשלום ראשון';
      }
    }
    
    if (position === 'middle') {
      switch (paymentRule.type) {
        case 'proportional':
          return 'תשלום אמצע - פרופורציונלי (חלוקה שווה)';
        case 'before_category_start':
          return 'תשלום אמצע - לפי התקדמות (לפני שלב)';
        default:
          return 'תשלום אמצע - באמצע הפרויקט';
      }
    }
    
    if (position === 'last') {
      switch (paymentRule.type) {
        case 'on_completion':
          return 'תשלום אחרון - בסיום העבודה';
        case 'days_after_completion':
          return `תשלום אחרון - ${paymentRule.days} ימים לאחר סיום עבודה`;
        default:
          return 'תשלום אחרון';
      }
    }
    
    return '';
  };

  useEffect(() => {
    const loadUserContract = async () => {
      try {
        const userData = await User.me();
        setUser(userData);

        if (userData.contractTemplate) {
          setContractText(userData.contractTemplate);
        } else {
          setContractText(DEFAULT_CONTRACT_TEMPLATE);
        }
        
        if (userData.contractorCommitments) {
          setContractorCommitments(userData.contractorCommitments);
        } else {
          setContractorCommitments(DEFAULT_CONTRACTOR_COMMITMENTS);
        }
        
        if (userData.clientCommitments) {
          setClientCommitments(userData.clientCommitments);
        } else {
          setClientCommitments(DEFAULT_CLIENT_COMMITMENTS);
        }
        
        let loadedTerms = (userData.defaultPaymentTerms && userData.defaultPaymentTerms.length === 3)
            ? userData.defaultPaymentTerms.map(term => ({
                ...term,
                id: term.id || crypto.randomUUID(),
                paymentDateRule: term.paymentDateRule || { type: 'proportional', days: 0 }
              }))
            : [
                { id: crypto.randomUUID(), milestone: '', percentage: 30, orderIndex: 1, paymentDateRule: { type: 'on_approval', days: 0 } },
                { id: crypto.randomUUID(), milestone: '', percentage: 40, orderIndex: 2, paymentDateRule: { type: 'proportional', days: 0 } },
                { id: crypto.randomUUID(), milestone: '', percentage: 30, orderIndex: 3, paymentDateRule: { type: 'on_completion', days: 0 } }
              ];
        
        if (loadedTerms[1] && ['midpoint', 'manual_date'].includes(loadedTerms[1].paymentDateRule.type)) {
            loadedTerms[1].paymentDateRule.type = 'proportional';
        }

        loadedTerms[0] = { ...loadedTerms[0], isFirst: true, isLast: false, milestone: generateMilestoneName('first', loadedTerms[0].paymentDateRule) };
        loadedTerms[1] = { ...loadedTerms[1], isFirst: false, isLast: false, milestone: generateMilestoneName('middle', loadedTerms[1].paymentDateRule) };
        loadedTerms[2] = { ...loadedTerms[2], isFirst: false, isLast: true, milestone: generateMilestoneName('last', loadedTerms[2].paymentDateRule) };

        setPaymentTerms(loadedTerms);
        
        if (userData.companyInfo) {
          setCompanyInfo({
            companyName: userData.companyInfo.companyName || '',
            companyOwnerName: userData.companyInfo.companyOwnerName || '',
            businessNumber: userData.companyInfo.businessNumber || '',
            address: userData.companyInfo.address || '',
            email: userData.companyInfo.email || '',
            phone: userData.companyInfo.phone || '',
            website: userData.companyInfo.website || '',
            logoUrl: userData.companyInfo.logoUrl || '',
            specialization: userData.companyInfo.specialization || '',
            facebookUrl: userData.companyInfo.facebookUrl || '',
            instagramUrl: userData.companyInfo.instagramUrl || ''
          });
        } else {
            setCompanyInfo({
                companyName: '',
                companyOwnerName: '',
                businessNumber: '',
                address: '',
                email: '',
                phone: '',
                website: '',
                logoUrl: '',
                specialization: '',
                facebookUrl: '',
                instagramUrl: ''
            });
        }

        setCommitments({
          cat_paint_plaster: userData?.categoryCommitments?.cat_paint_plaster || "",
          cat_tiling: userData?.categoryCommitments?.cat_tiling || "",
          cat_demolition: userData?.categoryCommitments?.cat_demolition || "",
          cat_electricity: userData?.categoryCommitments?.cat_electricity || "",
          cat_plumbing: userData?.categoryCommitments?.cat_plumbing || "",
          cat_construction: userData?.categoryCommitments?.cat_construction || "",
        });

      } catch (error) {
        console.error("Error loading user contract:", error);
        setContractText(DEFAULT_CONTRACT_TEMPLATE);
        setContractorCommitments(DEFAULT_CONTRACTOR_COMMITMENTS);
        setClientCommitments(DEFAULT_CLIENT_COMMITMENTS);
        
        const defaultTermsOnError = [
            { id: crypto.randomUUID(), milestone: '', percentage: 30, orderIndex: 1, paymentDateRule: { type: 'on_approval', days: 0 }, isFirst: true, isLast: false },
            { id: crypto.randomUUID(), milestone: '', percentage: 40, orderIndex: 2, paymentDateRule: { type: 'proportional', days: 0 }, isFirst: false, isLast: false },
            { id: crypto.randomUUID(), milestone: '', percentage: 30, orderIndex: 3, paymentDateRule: { type: 'on_completion', days: 0 }, isFirst: false, isLast: true }
        ];
        defaultTermsOnError[0].milestone = generateMilestoneName('first', defaultTermsOnError[0].paymentDateRule);
        defaultTermsOnError[1].milestone = generateMilestoneName('middle', defaultTermsOnError[1].paymentDateRule);
        defaultTermsOnError[2].milestone = generateMilestoneName('last', defaultTermsOnError[2].paymentDateRule);
        
        setPaymentTerms(defaultTermsOnError);

        setCompanyInfo({
            companyName: '',
            companyOwnerName: '',
            businessNumber: '',
            address: '',
            email: '',
            phone: '',
            website: '',
            logoUrl: '',
            specialization: '',
            facebookUrl: '',
            instagramUrl: ''
        });

        setCommitments({
          cat_paint_plaster: "",
          cat_tiling: "",
          cat_demolition: "",
          cat_electricity: "",
          cat_plumbing: "",
          cat_construction: "",
        });

      } finally {
        setLoading(false);
      }
    };

    loadUserContract();
  }, []);

  const handleSave = async () => {
    const totalPercentage = paymentTerms.reduce((sum, term) => sum + (Number(term.percentage) || 0), 0);
    if (totalPercentage !== 100) {
      alert('סך כל אחוזי התשלום חייב להיות 100%.');
      return;
    }

    setSaving(true);
    try {
      const termsToSave = paymentTerms.map(({ id, isFirst, isLast, ...rest }) => rest);
      await User.updateMyUserData({
        contractTemplate: contractText,
        contractorCommitments: contractorCommitments,
        clientCommitments: clientCommitments,
        defaultPaymentTerms: termsToSave,
        companyInfo: companyInfo,
        categoryCommitments: commitments,
      });
      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error("Error saving contract:", error);
      alert('שגיאה בשמירת הנתונים');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDefaultTemplate = () => {
    setContractText(DEFAULT_CONTRACT_TEMPLATE);
    setContractorCommitments(DEFAULT_CONTRACTOR_COMMITMENTS);
    setClientCommitments(DEFAULT_CLIENT_COMMITMENTS);
  };
  
  const handleLoadEmptyTemplate = () => {
    // contractText is no longer edited directly on this page, only commitments are cleared
    setContractorCommitments('');
    setClientCommitments('');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>חוזה קבלן</title>');
    printWindow.document.write('<style>body { direction: rtl; font-family: Arial, sans-serif; margin: 20px; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(contractText);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePaymentTermChange = (id, field, value) => {
    setPaymentTerms(prevTerms =>
      prevTerms.map(term =>
        term.id === id ? { ...term, [field]: value } : term
      )
    );
  };
  
  const handlePaymentRuleChange = (id, ruleKey, ruleValue) => {
      setPaymentTerms(prevTerms =>
          prevTerms.map(term => {
              if (term.id === id) {
                  const updatedRule = {
                      ...term.paymentDateRule,
                      [ruleKey]: ruleValue
                  };
                  
                  let updatedMilestone = term.milestone;
                  if (term.isFirst) {
                    updatedMilestone = generateMilestoneName('first', updatedRule);
                  } else if (term.isLast) {
                    updatedMilestone = generateMilestoneName('last', updatedRule);
                  } else {
                    updatedMilestone = generateMilestoneName('middle', updatedRule);
                  }
                  
                  return {
                      ...term,
                      paymentDateRule: updatedRule,
                      milestone: updatedMilestone
                  };
              }
              return term;
          })
      );
  };

  const handleCompanyInfoChange = (field, value) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleCompanyInfoChange('logoUrl', file_url);
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("שגיאה בהעלאת הלוגו.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const totalPercentage = paymentTerms.reduce((sum, term) => sum + (Number(term.percentage) || 0), 0);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mr-3">טוען נתונים...</p>
      </div>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-slate-50 border-b">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 rounded-lg shadow-md">
            <FileSignature className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">הגדרות חברה וחוזה</CardTitle>
            <CardDescription>כאן מגדירים את פרטי החברה, תנאי התשלום, התחייבויות לחוזה ותבנית החוזה.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        
        {/* Company Information Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200/50 mb-8">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full blur-xl"></div>
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-teal-400/15 to-emerald-500/15 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div 
                  className="relative group w-24 h-24 flex-shrink-0 flex items-center justify-center bg-white/50 rounded-2xl shadow-lg cursor-pointer hover:bg-white/80 transition-all border-2 border-dashed border-emerald-200 hover:border-emerald-300"
                  onClick={() => fileInputRef.current.click()}
                >
                  {isUploadingLogo ? (
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  ) : companyInfo.logoUrl ? (
                      <img src={companyInfo.logoUrl} alt="לוגו חברה" className="h-full w-full object-contain rounded-xl p-1" />
                  ) : (
                      <div className="text-center text-emerald-700">
                          <ImageIcon className="h-8 w-8 mx-auto" />
                          <span className="text-xs font-semibold mt-1 block">העלה לוגו</span>
                      </div>
                  )}
                   <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <Upload className="h-6 w-6 text-white" />
                   </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/png, image/jpeg, image/gif" />

                <div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-green-700 bg-clip-text text-transparent">
                    פרטי החברה
                  </h3>
                  <p className="text-emerald-600 font-medium mt-1">המידע שיופיע בכל הצעות המחיר שלך</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full border border-emerald-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-emerald-700 font-medium">פעיל</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg text-gray-800">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    פרטים בסיסיים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      שם החברה
                    </Label>
                    <Input
                      id="companyName"
                      value={companyInfo.companyName}
                      onChange={(e) => handleCompanyInfoChange('companyName', e.target.value)}
                      placeholder="חברת שיפוצים בע״מ"
                      className="text-base font-medium border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyOwnerName" className="text-sm font-semibold text-gray-700">שם בעל החברה</Label>
                    <Input
                      id="companyOwnerName"
                      value={companyInfo.companyOwnerName}
                      onChange={(e) => handleCompanyInfoChange('companyOwnerName', e.target.value)}
                      placeholder="ישראל ישראלי"
                      className="text-base border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessNumber" className="text-sm font-semibold text-gray-700">מספר עסק/ח.פ./ת.ז.</Label>
                    <Input
                      id="businessNumber"
                      value={companyInfo.businessNumber}
                      onChange={(e) => handleCompanyInfoChange('businessNumber', e.target.value)}
                      placeholder="123456789"
                      className="text-base border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="text-sm font-semibold text-gray-700">התמחות/סוג העסק</Label>
                    <Input
                      id="specialization"
                      value={companyInfo.specialization}
                      onChange={(e) => handleCompanyInfoChange('specialization', e.target.value)}
                      placeholder="שיפוצים, בנייה, צביעה"
                      className="text-base border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg text-gray-800">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Phone className="w-5 h-5 text-purple-600" />
                    </div>
                    פרטי קשר
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress" className="text-sm font-semibold text-gray-700">כתובת החברה</Label>
                    <Input
                      id="companyAddress"
                      value={companyInfo.address}
                      onChange={(e) => handleCompanyInfoChange('address', e.target.value)}
                      placeholder="רחוב הדוגמה 123, תל אביב"
                      className="text-base border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail" className="text-sm font-semibold text-gray-700">אימייל החברה</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={companyInfo.email}
                      onChange={(e) => handleCompanyInfoChange('email', e.target.value)}
                      placeholder="info@company.co.il"
                      className="text-base border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone" className="text-sm font-semibold text-gray-700">טלפון החברה</Label>
                    <Input
                      id="companyPhone"
                      type="tel"
                      value={companyInfo.phone}
                      onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
                      placeholder="03-1234567"
                      className="text-base border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-1 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg text-gray-800">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Share2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    נוכחות דיגיטלית
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        אתר אינטרנט
                      </Label>
                      <Input
                        id="website"
                        value={companyInfo.website}
                        onChange={(e) => handleCompanyInfoChange('website', e.target.value)}
                        placeholder="https://www.company.co.il"
                        className="text-base border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facebookUrl" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Facebook className="w-4 h-4 text-gray-400" />
                        פייסבוק
                      </Label>
                      <Input
                        id="facebookUrl"
                        value={companyInfo.facebookUrl}
                        onChange={(e) => handleCompanyInfoChange('facebookUrl', e.target.value)}
                        placeholder="https://www.facebook.com/company"
                        className="text-base border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagramUrl" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-gray-400" />
                        אינסטגרם
                      </Label>
                      <Input
                        id="instagramUrl"
                        value={companyInfo.instagramUrl}
                        onChange={(e) => handleCompanyInfoChange('instagramUrl', e.target.value)}
                        placeholder="https://www.instagram.com/company"
                        className="text-base border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Payment Terms Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mb-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-800">ניהול תנאי תשלום (ברירת מחדל)</h3>
                    <p className="text-gray-600">הגדר כאן את אבני הדרך הסטנדרטיות לתשלום. תוכל לשנות אותן עבור כל הצעת מחיר בנפרד.</p>
                </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="w-[45%] font-bold text-gray-700 py-4 px-6">אבן דרך (תיאור לתשלום)</TableHead>
                            <TableHead className="w-[15%] text-center font-bold text-gray-700 py-4">אחוז תשלום (%)</TableHead>
                            <TableHead className="w-[25%] text-center font-bold text-gray-700 py-4">כלל תזמון תשלום</TableHead>
                            <TableHead className="w-[15%] text-center font-bold text-gray-700 py-4">פעולות</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paymentTerms.map((term, index) => {
                            return(
                            <TableRow key={term.id} className="transition-colors bg-gray-50/50">
                                <TableCell className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <div className="text-base font-semibold text-gray-800 p-2">
                                          {term.milestone}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex justify-center">
                                        <Input
                                            type="number"
                                            value={term.percentage}
                                            onChange={(e) => handlePaymentTermChange(term.id, 'percentage', e.target.value)}
                                            className="w-20 text-center text-lg font-semibold border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 transition-all"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-3 text-center">
                                    <div className="flex items-center gap-2 justify-center">
                                    {term.isFirst ? (
                                        <>
                                            <Select 
                                                value={term.paymentDateRule.type} 
                                                onValueChange={(value) => handlePaymentRuleChange(term.id, 'type', value)}
                                            >
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue placeholder="בחר כלל תזמון" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="on_approval">בעת אישור הצעה</SelectItem>
                                                    <SelectItem value="days_before_start">לפני תחילת עבודה</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {term.paymentDateRule.type === 'days_before_start' && (
                                                <Input
                                                    type="number"
                                                    value={term.paymentDateRule.days}
                                                    onChange={(e) => handlePaymentRuleChange(term.id, 'days', Number(e.target.value))}
                                                    className="w-16 text-center text-sm"
                                                    min="0"
                                                />
                                            )}
                                        </>
                                    ) : term.isLast ? (
                                        <>
                                            <Select 
                                                value={term.paymentDateRule.type} 
                                                onValueChange={(value) => handlePaymentRuleChange(term.id, 'type', value)}
                                            >
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue placeholder="בחר כלל תזמון" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="on_completion">בסיום העבודה</SelectItem>
                                                    <SelectItem value="days_after_completion">לאחר סיום עבודה</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {term.paymentDateRule.type === 'days_after_completion' && (
                                                <Input
                                                    type="number"
                                                    value={term.paymentDateRule.days}
                                                    onChange={(e) => handlePaymentRuleChange(term.id, 'days', Number(e.target.value))}
                                                    className="w-16 text-center text-sm"
                                                    min="0"
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <Select 
                                            value={term.paymentDateRule.type} 
                                            onValueChange={(value) => handlePaymentRuleChange(term.id, 'type', value)}
                                        >
                                            <SelectTrigger className="text-sm">
                                                <SelectValue placeholder="בחר כלל תזמון" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="proportional">פרופורציונלי (חלוקה שווה)</SelectItem>
                                                <SelectItem value="before_category_start">לפי התקדמות (לפני שלב)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 text-center">
                                    <div className="text-gray-400">
                                        <span className="text-xs">קבוע</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </div>
            
            <div className="flex justify-end items-center mt-6">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">סה"כ:</span>
                    <div className={`px-4 py-2 rounded-full font-bold text-lg ${
                        totalPercentage === 100 
                            ? 'bg-green-100 text-green-800 border-2 border-green-200' 
                            : 'bg-orange-100 text-orange-800 border-2 border-orange-200'
                    }`}>
                        {totalPercentage}%
                    </div>
                </div>
            </div>

            {totalPercentage !== 100 && (
                <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-red-800 font-bold">שימו לב</AlertTitle>
                    <AlertDescription className="text-red-700">
                        סך כל אחוזי התשלום הוא {totalPercentage}%. יש לוודא שהסך הכולל הוא 100% לפני השמירה.
                    </AlertDescription>
                </Alert>
            )}
             {totalPercentage === 100 && (
                <Alert variant="default" className="mt-4 bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800 font-bold">מעולה!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        סך כל אחוזי התשלום הוא 100%.
                    </AlertDescription>
                </Alert>
            )}
        </div>

        <Separator className="my-8" />

        {/* Contractor Commitments Section */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-600 rounded-lg">
              <FileSignature className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">התחייבויות קבלן לפי קטגוריות</h3>
              <p className="text-gray-600">טקסט חופשי שיופיע בחוזה עבור כל קטגוריה. התחייבויות, תקנים, אחריות וכו'.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border border-blue-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
                  <Paintbrush className="w-5 h-5" />
                  צבע ושפכטל
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={commitments.cat_paint_plaster}
                  onChange={(e) => setCommitments({ ...commitments, cat_paint_plaster: e.target.value })}
                  placeholder="לדוגמה: שימוש בצבעים תקניים בלבד, הגנה על ריהוט, ניקיון יומי..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card className="border border-orange-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-orange-800">
                  <Building className="w-5 h-5" />
                  ריצוף וחיפוי
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={commitments.cat_tiling}
                  onChange={(e) => setCommitments({ ...commitments, cat_tiling: e.target.value })}
                  placeholder="יישור מצע, מרווחי פוגה, ניקיון ופינוי פסולת..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card className="border border-red-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-red-800">
                  <Trash2 className="w-5 h-5" />
                  הריסה ופינוי
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={commitments.cat_demolition}
                  onChange={(e) => setCommitments({ ...commitments, cat_demolition: e.target.value })}
                  placeholder="אבטחת אזור העבודה, ניהול רעש/אבק, פינוי מוסדר לאתר מורשה..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card className="border border-yellow-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-yellow-700">
                  <Lightbulb className="w-5 h-5" />
                  חשמל
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={commitments.cat_electricity}
                  onChange={(e) => setCommitments({ ...commitments, cat_electricity: e.target.value })}
                  placeholder="עמידה בתקן חשמלי, שימוש בחומרים מאושרים, בדיקות מסירה..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card className="border border-teal-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-teal-700">
                  <Wrench className="w-5 h-5" />
                  אינסטלציה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={commitments.cat_plumbing}
                  onChange={(e) => setCommitments({ ...commitments, cat_plumbing: e.target.value })}
                  placeholder="בדיקות לחץ, סימון נקודות, אחריות על דליפות..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card className="border border-purple-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-purple-800">
                  <Hammer className="w-5 h-5" />
                  בינוי (כללי)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={commitments.cat_construction}
                  onChange={(e) => setCommitments({ ...commitments, cat_construction: e.target.value })}
                  placeholder="חומרי בנייה לפי מפרט, הגנות, פיקוח, ניקיון..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Contract Template Section - רק ההתחייבויות */}
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-600 rounded-lg">
                    <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-800">תבנית החוזה</h3>
                    <p className="text-gray-600">ערוך את תוכן החוזה הסטנדרטי וההתחייבויות של שני הצדדים</p>
                </div>
            </div>
            
            <div className="flex gap-2 mb-6">
              <Button 
                variant="secondary" 
                onClick={handleLoadEmptyTemplate} // Modified: only clears commitments
              >
                <FileText className="ml-2 h-4 w-4" />
                התחל מחדש (דף ריק)
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleLoadDefaultTemplate}
              >
                <FileText className="ml-2 h-4 w-4" />
                טען תבנית ברירת מחדל
              </Button>
            </div>

            {/* התחייבויות - שני בלוקים זה לצד זה */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* התחייבויות הקבלן */}
              <Card className="border-2 border-emerald-200 bg-emerald-50/30">
                <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="w-5 h-5" />
                    התחייבויות הקבלן
                  </CardTitle>
                  <CardDescription className="text-emerald-50">
                    מה הקבלן מתחייב לבצע במסגרת העבודה
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <Textarea
                    value={contractorCommitments}
                    onChange={(e) => setContractorCommitments(e.target.value)}
                    placeholder="לדוגמה:&#10;• לבצע את העבודות במקצועיות&#10;• להשתמש בחומרים איכותיים&#10;• לשמור על ניקיון"
                    rows={10}
                    className="font-medium bg-white border-emerald-300 focus:border-emerald-500"
                    dir="rtl"
                  />
                </CardContent>
              </Card>

              {/* התחייבויות הלקוח */}
              <Card className="border-2 border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserIcon className="w-5 h-5" />
                    התחייבויות הלקוח
                  </CardTitle>
                  <CardDescription className="text-blue-50">
                    מה הלקוח מתחייב לספק ולבצע
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <Textarea
                    value={clientCommitments}
                    onChange={(e) => setClientCommitments(e.target.value)}
                    placeholder="לדוגמה:&#10;• לאפשר גישה לאתר העבודה&#10;• לשלם במועד&#10;• לספק אישורים נדרשים"
                    rows={10}
                    className="font-medium bg-white border-blue-300 focus:border-blue-500"
                    dir="rtl"
                  />
                </CardContent>
              </Card>
            </div>

            {/* הערה מסבירה */}
            <Alert className="mt-6 bg-purple-50 border-purple-200">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertTitle className="text-purple-800 font-bold">טיפ</AlertTitle>
              <AlertDescription className="text-purple-700">
                ההתחייבויות שתכתוב כאן יופיעו בחוזה הסופי שיישלח ללקוח. וודא שהן ברורות ומפורטות.
              </AlertDescription>
            </Alert>
        </div>

      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-12">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="ml-2 h-4 w-4" />
          הדפס
        </Button>
        <Button onClick={handleSave} disabled={saving || totalPercentage !== 100}>
          {saving ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="ml-2 h-4 w-4" />
          )}
          שמור תבנית
        </Button>
      </CardFooter>
    </Card>
  );
}
