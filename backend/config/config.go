package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	SupabaseURL       string
	SupabaseAnonKey   string
	SupabaseJWTSecret string
	FrontendURL       string
}

var AppConfig *Config

func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	AppConfig = &Config{
		Port:              getEnv("PORT", "8080"),
		SupabaseURL:       getEnv("SUPABASE_URL", ""),
		SupabaseAnonKey:   getEnv("SUPABASE_ANON_KEY", ""),
		SupabaseJWTSecret: getEnv("SUPABASE_JWT_SECRET", ""),
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:5173"),
	}

	if AppConfig.SupabaseURL == "" || AppConfig.SupabaseAnonKey == "" || AppConfig.SupabaseJWTSecret == "" {
		log.Fatal("Critical environment variables are missing (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET)")
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
