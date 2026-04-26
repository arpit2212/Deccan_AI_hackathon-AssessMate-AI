package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	SupabaseURL            string
	SupabaseAnonKey        string
	SupabaseServiceRoleKey string
	SupabaseJWTSecret      string
	FrontendURL            string
	GeminiAPIKey           string
}

var AppConfig *Config

func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	AppConfig = &Config{
		Port:                   getEnv("PORT", "8080"),
		SupabaseURL:            getEnv("SUPABASE_URL", ""),
		SupabaseAnonKey:        getEnv("SUPABASE_ANON_KEY", ""),
		SupabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
		SupabaseJWTSecret:      getEnv("SUPABASE_JWT_SECRET", ""),
		FrontendURL:            getEnv("FRONTEND_URL", "http://localhost:5173"),
		GeminiAPIKey:           getEnv("GEMINI_API_KEY", ""),
	}

	if AppConfig.SupabaseURL == "" || (AppConfig.SupabaseAnonKey == "" && AppConfig.SupabaseServiceRoleKey == "") || AppConfig.SupabaseJWTSecret == "" {
		log.Fatal("Critical environment variables are missing (SUPABASE_URL, SUPABASE_ANON_KEY/SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET)")
	}
	if AppConfig.GeminiAPIKey == "" {
		log.Println("Warning: GEMINI_API_KEY is missing. AI features will not work.")
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
