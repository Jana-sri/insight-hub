import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Image as ImageIcon, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

const ExportMenu = ({ darkMode, currentTopic, topicData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const cardBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-900';

  const exportToPDF = async () => {
    setExporting(true);
    toast.loading('Generating PDF...');

    try {
      const element = document.getElementById('dashboard-content');
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: darkMode ? '#111827' : '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add header
      pdf.setFontSize(20);
      pdf.setTextColor(139, 92, 246);
      pdf.text('InsightHub Analysis Report', 105, 15, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`Topic: ${currentTopic}`, 105, 25, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, 32, { align: 'center' });

      // Add content
      pdf.addImage(imgData, 'PNG', 10, 40, imgWidth, imgHeight);

      // Add footer
      const pageCount = pdf.internal.getNumberOfPages();
      pdf.setFontSize(10);
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.text(
          `Page ${i} of ${pageCount} | InsightHub © 2026`,
          105,
          pdf.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      pdf.save(`${currentTopic.replace(/\s+/g, '_')}_analysis.pdf`);
      toast.dismiss();
      toast.success('PDF exported successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export PDF');
      console.error('PDF export error:', error);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  const exportToExcel = () => {
    setExporting(true);
    toast.loading('Generating Excel...');

    try {
      // Summary sheet
      const summaryData = [
        ['InsightHub Analysis Report'],
        [''],
        ['Topic', currentTopic],
        ['Generated', new Date().toLocaleString()],
        [''],
        ['Sentiment', topicData.sentiment.sentiment],
        ['Sentiment Score', topicData.sentiment.sentimentScore],
        ['Summary', topicData.sentiment.summary],
        [''],
        ['Metrics'],
        ['Social Mentions', topicData.metrics.social],
        ['Trend Score', topicData.metrics.trend + '%'],
        ['Relevance', topicData.metrics.relevance + '%'],
        ['Potential Reach', topicData.metrics.reach],
      ];

      // News sheet
      const newsData = [
        ['Title', 'Source', 'Time', 'URL'],
        ...topicData.news.map(article => [
          article.title,
          article.source,
          article.time,
          article.url
        ])
      ];

      // Social sheet
      const socialData = [
        ['Platform', 'Title', 'Subreddit', 'Engagement', 'URL'],
        ...topicData.social.map(post => [
          post.platform,
          post.title,
          post.subreddit || 'N/A',
          post.engagement,
          post.url
        ])
      ];

      // Sentiment breakdown
      const sentimentData = [
        ['Type', 'Percentage'],
        ['Positive', topicData.sentiment.breakdown.positive + '%'],
        ['Neutral', topicData.sentiment.breakdown.neutral + '%'],
        ['Negative', topicData.sentiment.breakdown.negative + '%']
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      const wsNews = XLSX.utils.aoa_to_sheet(newsData);
      const wsSocial = XLSX.utils.aoa_to_sheet(socialData);
      const wsSentiment = XLSX.utils.aoa_to_sheet(sentimentData);

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      XLSX.utils.book_append_sheet(wb, wsNews, 'News');
      XLSX.utils.book_append_sheet(wb, wsSocial, 'Social Media');
      XLSX.utils.book_append_sheet(wb, wsSentiment, 'Sentiment');

      XLSX.writeFile(wb, `${currentTopic.replace(/\s+/g, '_')}_analysis.xlsx`);
      
      toast.dismiss();
      toast.success('Excel exported successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export Excel');
      console.error('Excel export error:', error);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  const exportAsImage = async () => {
    setExporting(true);
    toast.loading('Generating image...');

    try {
      const element = document.getElementById('dashboard-content');
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: darkMode ? '#111827' : '#ffffff'
      });

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentTopic.replace(/\s+/g, '_')}_analysis.png`;
        a.click();
        URL.revokeObjectURL(url);

        toast.dismiss();
        toast.success('Image exported successfully!');
      });
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export image');
      console.error('Image export error:', error);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  const copyShareLink = () => {
    const shareData = {
      topic: currentTopic,
      sentiment: topicData.sentiment.sentiment,
      score: topicData.sentiment.sentimentScore,
      timestamp: new Date().toISOString()
    };

    const shareText = `Check out this InsightHub analysis of ${currentTopic}!\nSentiment: ${topicData.sentiment.sentiment} (${topicData.sentiment.sentimentScore}/100)\n\nAnalyzed with InsightHub`;

    navigator.clipboard.writeText(shareText);
    toast.success('Share text copied to clipboard!');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
      >
        <Download className="w-5 h-5" />
        Export Report
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={`absolute right-0 mt-2 w-64 ${cardBgClass} rounded-xl shadow-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden z-50`}
          >
            <div className="p-2 space-y-1">
              {[
                { icon: FileText, label: 'Export as PDF', action: exportToPDF, color: 'text-red-600' },
                { icon: FileSpreadsheet, label: 'Export as Excel', action: exportToExcel, color: 'text-green-600' },
                { icon: ImageIcon, label: 'Export as Image', action: exportAsImage, color: 'text-blue-600' },
                { icon: Share2, label: 'Copy Share Link', action: copyShareLink, color: 'text-purple-600' }
              ].map((option, i) => {
                const Icon = option.icon;
                return (
                  <motion.button
                    key={i}
                    whileHover={{ x: 5, backgroundColor: darkMode ? '#374151' : '#f3f4f6' }}
                    onClick={option.action}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${textClass}`}
                  >
                    <Icon className={`w-5 h-5 ${option.color}`} />
                    <span className="font-medium">{option.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExportMenu;