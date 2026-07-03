import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  id?: string;
  principles?: any[];
  rating?: number;
  timestamp: Date;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected title = 'BuildWithAI Chat';
  
  // Dynamic API configuration - relative path routes through Nginx proxy
  backendUrl = '/api';
  showSettings = false;

  // Conversational Messages Stream
  messages: ChatMessage[] = [];
  userInput = '';
  isLoading = false;

  // Global solution logs (sidebar/bottom)
  history: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Restore backend URL if saved
    const savedBackendUrl = localStorage.getItem('buildwithai_backend_url');
    if (savedBackendUrl) {
      this.backendUrl = savedBackendUrl;
    }

    // Insert welcome greeting from BuildWithAI
    this.messages.push({
      sender: 'assistant',
      text: "Hello! I am BuildWithAI, your conversational engineering companion. Ask me general questions, or describe an engineering problem statement (e.g., 'I want speeds to improve, but memory is worsening') to trigger my built-in TRIZ MCP tool and generate customized software recommendations!",
      timestamp: new Date()
    });

    this.loadHistory();
  }

  saveSettings() {
    localStorage.setItem('buildwithai_backend_url', this.backendUrl);
    this.showSettings = false;
    this.loadHistory();
  }

  resetSettings() {
    this.backendUrl = '/api';
    localStorage.removeItem('buildwithai_backend_url');
    this.showSettings = false;
    this.loadHistory();
  }

  // ==========================================
  // Conversational Dispatcher
  // ==========================================
  send() {
    if (!this.userInput.trim() || this.isLoading) return;

    const userText = this.userInput.trim();
    this.userInput = '';
    this.isLoading = true;

    // Render user bubble immediately
    this.messages.push({
      sender: 'user',
      text: userText,
      timestamp: new Date()
    });

    // Fire POST call to backend
    this.http.post<any>(`${this.backendUrl}/solve`, {
      problemDescription: userText
    }).subscribe({
      next: (res) => {
        // Render AI bubble with its advice and optional principles
        this.messages.push({
          sender: 'assistant',
          text: res.advice,
          id: res.id,
          principles: res.principles || [],
          rating: res.rating || 0,
          timestamp: new Date(res.createdAt)
        });
        
        this.isLoading = false;
        this.loadHistory();
      },
      error: (err) => {
        this.isLoading = false;
        this.messages.push({
          sender: 'assistant',
          text: `🚨 Failed to contact backend. Please double check your Endpoint under Settings.\n(Error: ${err.message})`,
          timestamp: new Date()
        });
      }
    });
  }

  loadHistory() {
    this.http.get<any[]>(`${this.backendUrl}/history`).subscribe({
      next: (data) => {
        this.history = data;
      },
      error: (err) => {
        console.error('Failed to load global history:', err);
      }
    });
  }

  rate(id: string, rating: number, msgItem?: ChatMessage, historyItem?: any) {
    this.http.post<any>(`${this.backendUrl}/solutions/${id}/rate`, { rating }).subscribe({
      next: (updatedRecord) => {
        if (msgItem) {
          msgItem.rating = rating;
        }
        if (historyItem) {
          historyItem.rating = rating;
        }
        this.loadHistory();
      }
    });
  }
}
