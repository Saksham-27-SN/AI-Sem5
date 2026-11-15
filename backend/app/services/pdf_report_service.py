import os
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

class PDFReportService:
    """Generates official academic and commercial-grade interview performance reports."""

    def generate_interview_report(
        self,
        output_path: str,
        interview_data: Dict[str, Any],
        evaluation_data: Dict[str, Any],
        candidate_name: str
    ) -> str:
        """Constructs a beautifully formatted PDF performance audit report."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch
        )

        styles = getSampleStyleSheet()

        # Custom paragraph styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0B0F19'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#4B5563'),
            spaceAfter=15
        )
        h2_style = ParagraphStyle(
            'Heading2',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1E3A8A'),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#1F2937')
        )
        bullet_style = ParagraphStyle(
            'ReportBullet',
            parent=styles['Normal'],
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor('#374151'),
            leftIndent=12,
            spaceAfter=3
        )

        elements = []

        # Header Title
        elements.append(Paragraph("InterviewGenie AI — Evaluation Audit Report", title_style))
        elements.append(Paragraph(f"Candidate: <b>{candidate_name}</b> | Role: <b>{interview_data.get('target_role', 'Software Engineer')}</b> | Type: <b>{interview_data.get('interview_type', 'HR').upper()}</b>", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3B82F6'), spaceAfter=15))

        # Overall Performance Table
        overall_score = evaluation_data.get("overall_score", 0.0)
        round_scores = evaluation_data.get("round_scores", {})

        summary_table_data = [
            ["Metric", "Score / Assessment", "Evaluation Status"],
            ["Overall Performance", f"{overall_score} / 100", "READY" if overall_score >= 75 else "NEEDS PRACTICE"],
            ["Technical Accuracy", f"{round_scores.get('technical_accuracy', 0)} / 100", "Evaluated"],
            ["Communication Clarity", f"{round_scores.get('communication_clarity', 0)} / 100", "Evaluated"],
            ["Structure & Depth", f"{round_scores.get('structure_and_depth', 0)} / 100", "STAR Method"],
            ["Relevance", f"{round_scores.get('relevance', 0)} / 100", "Direct Alignment"]
        ]

        summary_table = Table(summary_table_data, colWidths=[2.2 * inch, 2.2 * inch, 2.4 * inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 15))

        # Key Strengths
        elements.append(Paragraph("Demonstrated Strengths", h2_style))
        strengths = evaluation_data.get("overall_strengths", [])
        for s in strengths:
            elements.append(Paragraph(f"• <b>{s}</b>", bullet_style))
        elements.append(Spacer(1, 10))

        # Critical Weaknesses
        elements.append(Paragraph("Areas Requiring Improvement", h2_style))
        weaknesses = evaluation_data.get("critical_weaknesses", [])
        for w in weaknesses:
            elements.append(Paragraph(f"• <b>{w}</b>", bullet_style))
        elements.append(Spacer(1, 10))

        # Personalized Study & Preparation Plan
        elements.append(Paragraph("Personalized Preparation Plan", h2_style))
        plan = evaluation_data.get("improvement_plan", [])
        for item in plan:
            elements.append(Paragraph(f"<b>{item.get('topic', 'Topic')}:</b> {item.get('recommendation', '')}", bullet_style))
            elements.append(Spacer(1, 4))

        # Footer Notice
        elements.append(Spacer(1, 20))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceAfter=8))
        elements.append(Paragraph("<i>This evaluation report is generated deterministically by the InterviewGenie AI multi-agent assessment system for educational preparation.</i>", body_style))

        doc.build(elements)
        return output_path

pdf_report_service = PDFReportService()
