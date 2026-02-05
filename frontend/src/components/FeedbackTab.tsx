"use client";

import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle2, Lightbulb } from "lucide-react";

export default function FeedbackContent() {
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        role: "student",
        category: "suggestion",
        rating: 5,
        message: "",
        consent: true
    });

    const handleChange = (field: keyof typeof form, value: string | number | boolean) => {
        setForm((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.message.trim()) return;
        setSubmitted(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl p-8 border border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-50 rounded-lg">
                        <MessageSquare className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Share Feedback & Suggestions</h2>
                        <p className="text-slate-600">Help us improve the microgrid virtual lab experience.</p>
                    </div>
                </div>

                {submitted && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600" />
                        <div>
                            <p className="font-medium">Thanks for your feedback!</p>
                            <p className="text-sm text-emerald-700">We review suggestions regularly to improve future updates.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-5">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    placeholder="Your name"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => handleChange("role", e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="student">Student</option>
                                    <option value="researcher">Researcher</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="industry">Industry Professional</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Feedback Type</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => handleChange("category", e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="suggestion">Feature Suggestion</option>
                                    <option value="bug">Bug Report</option>
                                    <option value="content">Content Improvement</option>
                                    <option value="ux">Usability Issue</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Overall Experience</label>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleChange("rating", value)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${form.rating >= value
                                            ? "bg-emerald-600 text-white border-emerald-600"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                                            }`}
                                    >
                                        {value}
                                    </button>
                                ))}
                                <span className="text-xs text-slate-500">1 (low) → 5 (high)</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Your Feedback</label>
                            <textarea
                                value={form.message}
                                onChange={(e) => handleChange("message", e.target.value)}
                                placeholder="Tell us what we should improve or add..."
                                rows={5}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <label className="flex items-start gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={form.consent}
                                onChange={(e) => handleChange("consent", e.target.checked)}
                                className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            I agree that my feedback may be used to improve this virtual lab experience.
                        </label>

                        <div className="flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={!form.message.trim()}
                                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${!form.message.trim()
                                    ? "bg-slate-300 cursor-not-allowed"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                                    }`}
                            >
                                <Send className="w-4 h-4" />
                                Submit Feedback
                            </button>
                            <span className="text-xs text-slate-500">We typically respond within 3-5 days.</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <h3 className="text-sm font-semibold text-slate-800 mb-2">What happens next?</h3>
                            <ul className="text-sm text-slate-600 space-y-2">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                    We categorize feedback into bugs, usability, and feature requests.
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                    High-impact suggestions are prioritized for upcoming releases.
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                    If you add an email, we can follow up for clarification.
                                </li>
                            </ul>
                        </div>

                        <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 text-sm text-amber-800">
                            <div className="flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 mt-0.5 text-amber-600" />
                                <p>For urgent issues during a lab session, mention the simulation step and hour for faster triage.</p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
