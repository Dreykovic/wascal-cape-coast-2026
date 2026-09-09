<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GalleryController;
use App\Http\Controllers\JourneyStageController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\SurveyController;
use Illuminate\Support\Facades\Route;

// --- Pages (front vanilla servi statiquement depuis resources/pages) --------
Route::get('/', [PageController::class, 'index']);
Route::get('/survey', [PageController::class, 'survey']);
Route::get('/admin', [PageController::class, 'admin']);    // page publique ; l'API derrière exige l'auth
// Pas de route /parcours : le site est un one-page (index.html). Les étapes du parcours sont une
// section de ce deck, alimentée par GET /api/journey-stages ci-dessous.

// --- API publique -----------------------------------------------------------
Route::post('/api/responses', [SurveyController::class, 'store']);
Route::get('/api/survey-status', [SurveyController::class, 'status']);
Route::get('/api/gallery', [GalleryController::class, 'index']);
Route::get('/api/journey-stages', [JourneyStageController::class, 'index']);

// --- Authentification (session : super-admin uniquement) --------------------
Route::post('/api/admin/login', [AuthController::class, 'adminLogin']);
Route::post('/api/admin/logout', [AuthController::class, 'logout']);
Route::get('/api/admin/me', [AuthController::class, 'me']);
Route::get('/api/session', [AuthController::class, 'session']);

// --- Admin (super-admin uniquement) -----------------------------------------
Route::middleware('admin')->group(function () {
    Route::get('/api/admin/responses', [AdminController::class, 'responses']);
    Route::get('/api/admin/export.csv', [AdminController::class, 'exportCsv']);
    Route::post('/api/admin/gallery/settings', [AdminController::class, 'gallerySettings']);
    Route::post('/api/admin/survey/toggle', [AdminController::class, 'surveyToggle']);

    // Galerie : gestion complète (plus de scope par comité).
    Route::get('/api/gallery/manage', [GalleryController::class, 'manage']);
    Route::post('/api/gallery/album', [GalleryController::class, 'storeAlbum']);
    Route::patch('/api/gallery/album/{id}', [GalleryController::class, 'updateAlbum']);
    Route::delete('/api/gallery/album/{id}', [GalleryController::class, 'deleteAlbum']);
    Route::post('/api/gallery/photo', [GalleryController::class, 'storePhoto']);
    Route::patch('/api/gallery/photo/{id}', [GalleryController::class, 'updatePhoto']);
    Route::delete('/api/gallery/photo/{id}', [GalleryController::class, 'deletePhoto']);

    // Étapes du parcours (carnet de bord).
    Route::post('/api/admin/journey-stages', [JourneyStageController::class, 'store']);
    Route::patch('/api/admin/journey-stages/{id}', [JourneyStageController::class, 'update']);
    Route::delete('/api/admin/journey-stages/{id}', [JourneyStageController::class, 'destroy']);
    Route::post('/api/admin/journey-stages/reorder', [JourneyStageController::class, 'reorder']);
});
