import 'package:flutter/material.dart';

class ASUColors {
  // Primary ASU Colors
  static const Color maroon = Color(0xFF8C1D40);
  static const Color gold = Color(0xFFFFC627);
  
  // Secondary Colors
  static const Color blue = Color(0xFF00A3E0);
  static const Color green = Color(0xFF78BE20);
  static const Color orange = Color(0xFFFF7F32);
  static const Color pink = Color(0xFFE74973);
  
  // Neutral Colors
  static const Color gray1 = Color(0xFF484848);
  static const Color gray2 = Color(0xFF747474);
  static const Color gray3 = Color(0xFFA3A3A3);
  static const Color gray4 = Color(0xFFD0D0D0);
  static const Color gray5 = Color(0xFFE8E8E8);
  static const Color gray6 = Color(0xFFF5F5F5);
}

class ASUTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: ASUColors.maroon,
        brightness: Brightness.light,
        primary: ASUColors.maroon,
        secondary: ASUColors.gold,
        tertiary: ASUColors.blue,
        surface: Colors.white,
        background: ASUColors.gray6,
        error: ASUColors.pink,
        onPrimary: Colors.white,
        onSecondary: ASUColors.gray1,
        onSurface: ASUColors.gray1,
        onBackground: ASUColors.gray1,
      ),
      
      // App Bar Theme
      appBarTheme: const AppBarTheme(
        backgroundColor: ASUColors.maroon,
        foregroundColor: Colors.white,
        elevation: 2,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      
      // Elevated Button Theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: ASUColors.maroon,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          elevation: 2,
        ),
      ),
      
      // Card Theme
      cardTheme: CardThemeData(
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        color: Colors.white,
        shadowColor: ASUColors.gray3.withOpacity(0.3),
      ),
      
      // Text Theme
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: ASUColors.maroon,
        ),
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: ASUColors.maroon,
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: ASUColors.gray1,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: ASUColors.gray1,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: ASUColors.gray1,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: ASUColors.gray2,
        ),
      ),
      
      // Icon Theme
      iconTheme: const IconThemeData(
        color: ASUColors.gray2,
        size: 24,
      ),
      
      // Input Decoration Theme
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: ASUColors.gray4),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: ASUColors.maroon, width: 2),
        ),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }
  
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: ASUColors.maroon,
        brightness: Brightness.dark,
        primary: ASUColors.gold,
        secondary: ASUColors.maroon,
        tertiary: ASUColors.blue,
        surface: ASUColors.gray1,
        background: Colors.black,
        error: ASUColors.pink,
        onPrimary: ASUColors.gray1,
        onSecondary: Colors.white,
        onSurface: Colors.white,
        onBackground: Colors.white,
      ),
    );
  }
}

// Helper functions for transparency and effects
extension ColorTransparency on Color {
  Color withTransparency(double opacity) {
    return withOpacity(opacity);
  }
  
  Color get glass => withOpacity(0.8);
  Color get subtle => withOpacity(0.6);
  Color get faint => withOpacity(0.3);
}