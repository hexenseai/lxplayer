"""
Flow Analyzer Service - LLM'nin eğitim akışına karar vermesi için
"""

import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlmodel import Session, select

from app.models import Training, TrainingSection, InteractionSession, InteractionMessage
from app.schemas import LLMMessageResponse


class FlowAnalyzer:
    """Flow data'sını analiz ederek LLM'ye eğitim akışı önerileri sunar"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def analyze_flow(self, training_id: str, session_id: str) -> Dict[str, Any]:
        """Flow data'sını analiz ederek mevcut durum ve önerileri döndürür"""
        
        # Training ve flow data'sını al
        training = self.db.get(Training, training_id)
        if not training or not training.ai_flow:
            return self._get_default_flow()
        
        try:
            flow_data = json.loads(training.ai_flow)
        except json.JSONDecodeError:
            return self._get_default_flow()
        
        # Session ve mevcut durumu al
        session = self.db.get(InteractionSession, session_id)
        if not session:
            return self._get_default_flow()
        
        # Flow nodes ve edges'leri analiz et
        nodes = flow_data.get('nodes', [])
        edges = flow_data.get('edges', [])
        
        # Mevcut section'ı bul
        current_section_id = session.current_section_id
        current_node = self._find_current_node(nodes, current_section_id)
        
        # Olası sonraki adımları belirle
        possible_paths = self._analyze_possible_paths(nodes, edges, current_node)
        
        # Kullanıcı progress'ini analiz et
        user_progress = self._analyze_user_progress(session)
        
        # LLM önerileri oluştur
        flow_recommendations = self._generate_flow_recommendations(
            current_node, possible_paths, user_progress
        )
        
        return {
            "current_node": current_node,
            "possible_paths": possible_paths,
            "user_progress": user_progress,
            "recommendations": flow_recommendations,
            "flow_data": flow_data,
            "session_context": {
                "session_id": session_id,
                "current_section_id": current_section_id,
                "status": session.status,
                "phase": session.current_phase,
                "interactions_count": session.interactions_count,
                "completion_percentage": session.completion_percentage
            }
        }
    
    def _find_current_node(self, nodes: List[Dict], current_section_id: Optional[str]) -> Optional[Dict]:
        """Mevcut section'a karşılık gelen node'u bulur"""
        if not current_section_id:
            return self._find_start_node(nodes)
        
        for node in nodes:
            if node.get('type') == 'sectionNode':
                data = node.get('data', {})
                if data.get('sectionId') == current_section_id or data.get('section_id') == current_section_id:
                    return node
        
        return self._find_start_node(nodes)
    
    def _find_start_node(self, nodes: List[Dict]) -> Optional[Dict]:
        """Start node'u bulur"""
        for node in nodes:
            if node.get('type') == 'startNode':
                return node
        return None
    
    def _analyze_possible_paths(self, nodes: List[Dict], edges: List[Dict], current_node: Optional[Dict]) -> List[Dict]:
        """Mevcut node'dan gidilebilecek olası yolları analiz eder"""
        if not current_node:
            return []
        
        current_id = current_node.get('id')
        possible_paths = []
        
        # Mevcut node'dan çıkan edge'leri bul
        for edge in edges:
            if edge.get('source') == current_id:
                target_id = edge.get('target')
                target_node = self._find_node_by_id(nodes, target_id)
                
                if target_node:
                    path_info = {
                        "target_node": target_node,
                        "edge": edge,
                        "priority": self._calculate_path_priority(target_node, edge),
                        "conditions": self._extract_conditions(edge)
                    }
                    possible_paths.append(path_info)
        
        # Priority'ye göre sırala
        possible_paths.sort(key=lambda x: x['priority'], reverse=True)
        
        return possible_paths
    
    def _find_node_by_id(self, nodes: List[Dict], node_id: str) -> Optional[Dict]:
        """ID'ye göre node bulur"""
        for node in nodes:
            if node.get('id') == node_id:
                return node
        return None
    
    def _calculate_path_priority(self, target_node: Dict, edge: Dict) -> int:
        """Path priority'sini hesaplar"""
        priority = 50  # Base priority
        
        # Node type'a göre priority
        node_type = target_node.get('type')
        if node_type == 'sectionNode':
            priority += 20
        elif node_type == 'taskNode':
            priority += 15
        elif node_type == 'endNode':
            priority += 10
        
        # Edge label'ına göre priority
        edge_label = edge.get('data', {}).get('label', '').lower()
        if 'next' in edge_label or 'continue' in edge_label:
            priority += 10
        elif 'skip' in edge_label:
            priority -= 5
        elif 'back' in edge_label or 'previous' in edge_label:
            priority -= 10
        
        return priority
    
    def _extract_conditions(self, edge: Dict) -> List[str]:
        """Edge'den condition'ları çıkarır"""
        conditions = []
        edge_data = edge.get('data', {})
        
        if edge_data.get('condition'):
            conditions.append(edge_data['condition'])
        
        if edge_data.get('label'):
            conditions.append(f"Label: {edge_data['label']}")
        
        return conditions
    
    def _analyze_user_progress(self, session: InteractionSession) -> Dict[str, Any]:
        """Kullanıcı progress'ini analiz eder"""
        
        # Son mesajları al
        recent_messages = self.db.exec(
            select(InteractionMessage)
            .where(InteractionMessage.session_id == session.id)
            .order_by(InteractionMessage.timestamp.desc())
            .limit(5)
        ).all()
        
        # Progress metrikleri
        progress_metrics = {
            "completion_percentage": session.completion_percentage,
            "interactions_count": session.interactions_count,
            "time_spent": session.total_time_spent,
            "current_phase": session.current_phase,
            "recent_activity": len(recent_messages),
            "engagement_level": self._calculate_engagement_level(session, recent_messages)
        }
        
        return progress_metrics
    
    def _calculate_engagement_level(self, session: InteractionSession, recent_messages: List[InteractionMessage]) -> str:
        """Kullanıcı engagement seviyesini hesaplar"""
        if session.interactions_count > 10:
            return "high"
        elif session.interactions_count > 5:
            return "medium"
        else:
            return "low"
    
    def _generate_flow_recommendations(self, current_node: Optional[Dict], possible_paths: List[Dict], user_progress: Dict[str, Any]) -> Dict[str, Any]:
        """Flow önerileri oluşturur"""
        
        recommendations = {
            "suggested_next_action": None,
            "alternative_paths": [],
            "flow_guidance": "",
            "user_guidance": ""
        }
        
        if not possible_paths:
            recommendations["suggested_next_action"] = "complete_training"
            recommendations["flow_guidance"] = "Eğitim tamamlandı. Sonraki adım yok."
            return recommendations
        
        # En yüksek priority'li path'i öner
        best_path = possible_paths[0]
        recommendations["suggested_next_action"] = best_path['target_node']['id']
        recommendations["alternative_paths"] = possible_paths[1:3]  # İlk 2 alternatif
        
        # Flow guidance oluştur
        target_node = best_path['target_node']
        recommendations["flow_guidance"] = self._generate_flow_guidance(target_node, best_path)
        
        # User guidance oluştur
        recommendations["user_guidance"] = self._generate_user_guidance(user_progress, target_node)
        
        return recommendations
    
    def _generate_flow_guidance(self, target_node: Dict, path_info: Dict) -> str:
        """Flow guidance mesajı oluşturur"""
        node_type = target_node.get('type')
        node_label = target_node.get('data', {}).get('label', '')
        
        if node_type == 'sectionNode':
            return f"Sonraki bölüme geç: {node_label}"
        elif node_type == 'taskNode':
            return f"Görev başlat: {node_label}"
        elif node_type == 'endNode':
            return "Eğitimi tamamla"
        else:
            return f"Sonraki adım: {node_label}"
    
    def _generate_user_guidance(self, user_progress: Dict[str, Any], target_node: Dict) -> str:
        """Kullanıcı guidance mesajı oluşturur"""
        engagement = user_progress.get('engagement_level', 'low')
        interactions = user_progress.get('interactions_count', 0)
        
        if engagement == 'low' and interactions < 3:
            return "Daha aktif katılım göstermenizi öneriyorum."
        elif engagement == 'high':
            return "Mükemmel katılım! Devam edin."
        else:
            return "İyi gidiyorsunuz, devam edebilirsiniz."
    
    def _get_default_flow(self) -> Dict[str, Any]:
        """Default flow döndürür"""
        return {
            "current_node": None,
            "possible_paths": [],
            "user_progress": {},
            "recommendations": {
                "suggested_next_action": "linear_progression",
                "alternative_paths": [],
                "flow_guidance": "Sıralı ilerleme devam ediyor.",
                "user_guidance": "Normal akış devam ediyor."
            },
            "flow_data": None,
            "session_context": {}
        }
    
    def get_llm_context_with_flow(self, session_id: str) -> str:
        """LLM için flow-aware context oluşturur"""
        session = self.db.get(InteractionSession, session_id)
        if not session:
            return "Session bulunamadı."
        
        # Flow analizi yap
        flow_analysis = self.analyze_flow(session.training_id, session_id)
        
        # Context string oluştur
        context_parts = [
            "# FLOW-AWARE EĞİTİM ASİSTANI",
            f"## MEVCUT DURUM: {flow_analysis['session_context'].get('phase', 'unknown')}",
            ""
        ]
        
        # Mevcut node bilgisi
        if flow_analysis['current_node']:
            current_node = flow_analysis['current_node']
            context_parts.extend([
                f"## MEVCUT KONUM: {current_node.get('data', {}).get('label', 'Bilinmeyen')}",
                f"**Node ID:** {current_node.get('id')}",
                f"**Node Type:** {current_node.get('type')}",
                ""
            ])
        
        # Olası yollar
        if flow_analysis['possible_paths']:
            context_parts.extend([
                "## OLASI SONRAKI ADIMLAR:",
                ""
            ])
            for i, path in enumerate(flow_analysis['possible_paths'][:3]):
                target_node = path['target_node']
                context_parts.extend([
                    f"### {i+1}. {target_node.get('data', {}).get('label', 'Bilinmeyen')}",
                    f"- **Priority:** {path['priority']}",
                    f"- **Type:** {target_node.get('type')}",
                    ""
                ])
        
        # Öneriler
        recommendations = flow_analysis['recommendations']
        context_parts.extend([
            "## FLOW ÖNERİLERİ:",
            f"**Önerilen Sonraki Adım:** {recommendations.get('suggested_next_action', 'Bilinmiyor')}",
            f"**Flow Guidance:** {recommendations.get('flow_guidance', '')}",
            f"**User Guidance:** {recommendations.get('user_guidance', '')}",
            ""
        ])
        
        # Kullanıcı progress
        user_progress = flow_analysis['user_progress']
        if user_progress:
            context_parts.extend([
                "## KULLANICI İLERLEMESİ:",
                f"- **Tamamlanma:** %{user_progress.get('completion_percentage', 0)}",
                f"- **Etkileşim Sayısı:** {user_progress.get('interactions_count', 0)}",
                f"- **Engagement Seviyesi:** {user_progress.get('engagement_level', 'unknown')}",
                f"- **Mevcut Faz:** {user_progress.get('current_phase', 'unknown')}",
                ""
            ])
        
        context_parts.extend([
            "## GÖREV TALİMATLARI:",
            "1. Yukarıdaki flow analizini kullanarak kullanıcıya rehberlik et",
            "2. Önerilen sonraki adımı takip et",
            "3. Kullanıcı engagement seviyesini dikkate al",
            "4. Flow guidance'ı kullanarak doğru yönlendirme yap",
            "5. Gerekirse alternatif yolları öner",
            ""
        ])
        
        return "\n".join(context_parts)
