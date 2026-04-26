package db

import (
	"assessmate-backend/config"

	"github.com/supabase-community/supabase-go"
)

var Client *supabase.Client

func InitDB() error {
	var err error
	key := config.AppConfig.SupabaseServiceRoleKey
	if key == "" {
		key = config.AppConfig.SupabaseAnonKey
	}
	Client, err = supabase.NewClient(config.AppConfig.SupabaseURL, key, nil)
	return err
}
