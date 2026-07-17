<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GalleryController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\SurveyController;
use Illuminate\Support\Facades\Route;

// --- Pages (front vanilla servi statiquement depuis resources/pages) --------
Route::get('/', [PageController::class, 'index']);
Route::get('/survey', [PageController::class, 'survey']);
Route::get('/admin', [PageController::class, 'admin']);    // page publique ; l'API derrière exige l'auth
Route::get('/comite', [PageController::class, 'comite']);

// --- API publique -----------------------------------------------------------
Route::post('/api/responses', [SurveyController::class, 'store']);
Route::get('/api/gallery', [GalleryController::class, 'index']);

// --- Authentification (session : super-admin OU comité par code) -------------
Route::post('/api/admin/login', [AuthController::class, 'adminLogin']);
Route::post('/api/comite/login', [AuthController::class, 'comiteLogin']);
Route::post('/api/admin/logout', [AuthController::class, 'logout']);
Route::post('/api/comite/logout', [AuthController::class, 'logout']);
Route::get('/api/admin/me', [AuthController::class, 'me']);
Route::get('/api/session', [AuthController::class, 'session']);

// --- Admin (super-admin uniquement) -----------------------------------------
Route::middleware('admin')->group(function () {
    Route::get('/api/admin/responses', [AdminController::class, 'responses']);
    Route::post('/api/admin/assign', [AdminController::class, 'assign']);
    Route::get('/api/admin/export.csv', [AdminController::class, 'exportCsv']);
    Route::post('/api/admin/gallery/settings', [AdminController::class, 'gallerySettings']);
    Route::post('/api/admin/gallery/code', [AdminController::class, 'generateCode']);
    Route::delete('/api/admin/gallery/code/{owner}', [AdminController::class, 'revokeCode']);
});

// --- Galerie : gestion (super-admin OU comité, scopée par propriétaire) ------
Route::middleware('gallery')->group(function () {
    Route::get('/api/gallery/manage', [GalleryController::class, 'manage']);
    Route::post('/api/gallery/album', [GalleryController::class, 'storeAlbum']);
    Route::patch('/api/gallery/album/{id}', [GalleryController::class, 'updateAlbum']);
    Route::delete('/api/gallery/album/{id}', [GalleryController::class, 'deleteAlbum']);
    Route::post('/api/gallery/photo', [GalleryController::class, 'storePhoto']);
    Route::patch('/api/gallery/photo/{id}', [GalleryController::class, 'updatePhoto']);
    Route::delete('/api/gallery/photo/{id}', [GalleryController::class, 'deletePhoto']);
});
